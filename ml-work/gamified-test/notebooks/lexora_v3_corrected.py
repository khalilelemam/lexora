# ============================================================
# Lexora v3 — Corrected Dyslexia Screening Pipeline
# ============================================================
# Fixes applied vs lexora_dyslexia_pipeline.ipynb:
#
#  Fix 1 — Clip all Accuracy & Missrate columns to [0, 1].
#           Raw data contains values up to 875 due to a
#           division bug in the original Dytective export.
#
#  Fix 2 — Drop Accuracy14-17 & Missrate14-17 from features.
#           Training data used a static-position mechanic;
#           current app uses a cycling-variant mechanic.
#           The two mechanics produce incomparable numbers.
#           Clicks/Hits/Misses/Score for Q14-17 are kept —
#           they remain valid regardless of mechanic.
#
#  Fix 3 — Add "attempt accuracy" features for Q26, Q27,
#           Q28, Q30, Q31, Q32 where raw Accuracy = Hits/Clicks
#           is structurally misleading:
#             Q26: 2 clicks per attempt → raw accuracy ≈ 0.5×
#             Q27/Q28: intermediate tile taps inflate Clicks
#             Q30-32: keystrokes inflate Clicks vs per-round Hits
#           Corrected: AdjAcc = Hits/(Hits+Misses), 0 if both=0
#
#  Fix 4 — Threshold optimised via Youden's J on CV OOF probs
#           instead of using the paper's tablet thresholds
#           verbatim. Paper threshold 0.155 for G3 is too
#           aggressive on the English/Arabic adaptation.
#
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings, os, joblib
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, precision_recall_curve
)
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

os.makedirs('models_v3', exist_ok=True)
print('Libraries loaded ✓')


# ── 1. Load & Combine ─────────────────────────────────────────────────────────
DESKTOP_PATH = 'Dyt-desktop.csv'
TABLET_PATH  = 'Dyt-tablet.csv'

desktop = pd.read_csv(DESKTOP_PATH, sep=';')
tablet  = pd.read_csv(TABLET_PATH,  sep=';')
desktop['source'] = 'desktop'
tablet['source']  = 'tablet'

df = pd.concat([desktop, tablet], ignore_index=True)
df.replace('NULL', np.nan, inplace=True)
df['label'] = (df['Dyslexia'] == 'Yes').astype(int)

print(f'Combined dataset: {df.shape}')
print(df['label'].value_counts().rename({0:'No Dyslexia', 1:'Dyslexia'}))


# ── 2. Preprocessing ──────────────────────────────────────────────────────────
le_gender = LabelEncoder()
le_native = LabelEncoder()
le_other  = LabelEncoder()

df['Gender']     = le_gender.fit_transform(df['Gender'].fillna('Unknown'))
df['Nativelang'] = le_native.fit_transform(df['Nativelang'].fillna('Unknown'))
df['Otherlang']  = le_other.fit_transform(df['Otherlang'].fillna('Unknown'))

ALL_QS   = list(range(1, 33))
MEASURES = ['Clicks', 'Hits', 'Misses', 'Score', 'Accuracy', 'Missrate']

all_q_cols = [f'{m}{q}' for q in ALL_QS for m in MEASURES]
df[all_q_cols] = df[all_q_cols].apply(pd.to_numeric, errors='coerce')

# ── FIX 1: Clip Accuracy & Missrate to valid range [0, 1] ─────────────────────
acc_cols  = [f'Accuracy{q}'  for q in ALL_QS if f'Accuracy{q}'  in df.columns]
miss_cols = [f'Missrate{q}'  for q in ALL_QS if f'Missrate{q}'  in df.columns]

before = df[acc_cols].max().max()
df[acc_cols]  = df[acc_cols].clip(0, 1)
df[miss_cols] = df[miss_cols].clip(0, 1)
after  = df[acc_cols].max().max()
print(f'\nFix 1 — Accuracy clipped: max was {before:.1f}, now {after:.3f}')

# ── FIX 3: Adjusted accuracy for broken-mechanic questions ───────────────────
# For Q26, Q27, Q28, Q30, Q31, Q32: use Hits/(Hits+Misses) instead of Hits/Clicks
ADJUSTED_ACC_QS = [26, 27, 28, 30, 31, 32]

for q in ADJUSTED_ACC_QS:
    h = df.get(f'Hits{q}',   pd.Series(np.nan, index=df.index))
    m = df.get(f'Misses{q}', pd.Series(np.nan, index=df.index))
    denom = h + m
    df[f'AdjAcc{q}']  = np.where(denom > 0, h / denom, 0.0)
    df[f'AdjMiss{q}'] = np.where(denom > 0, m / denom, 0.0)

print('Fix 3 — Adjusted accuracy columns created for Q26-28, Q30-32 ✓')
print(df[[f'AdjAcc{q}' for q in ADJUSTED_ACC_QS]].describe().loc[['min','max','mean']])


# ── 3. Age-Group Definitions ──────────────────────────────────────────────────
# Q14-17: keep Clicks/Hits/Misses/Score but EXCLUDE Accuracy/Missrate (Fix 2)
# Q26-32: replace raw Accuracy/Missrate with AdjAcc/AdjMiss (Fix 3)

CYCLING_MECHANIC_QS  = [14, 15, 16, 17]   # drop Accuracy & Missrate
ADJUSTED_ACC_QS_SET  = set(ADJUSTED_ACC_QS)

BASE_MEASURES         = ['Clicks', 'Hits', 'Misses', 'Score']
FULL_MEASURES         = BASE_MEASURES + ['Accuracy', 'Missrate']
ADJUSTED_MEASURES     = BASE_MEASURES + ['AdjAcc', 'AdjMiss']


def get_feature_cols(q_list):
    """
    Return feature column names per question, applying fixes:
    - Q14-17: only BASE_MEASURES (no Accuracy/Missrate)
    - Q26-32: use AdjAcc / AdjMiss instead of Accuracy / Missrate
    - All others: FULL_MEASURES
    """
    cols = ['Gender', 'Nativelang', 'Otherlang', 'Age']
    for q in q_list:
        if q in CYCLING_MECHANIC_QS:
            measures = BASE_MEASURES
        elif q in ADJUSTED_ACC_QS_SET:
            measures = ADJUSTED_MEASURES
        else:
            measures = FULL_MEASURES
        for m in measures:
            col = f'{m}{q}'
            if col in df.columns:
                cols.append(col)
    return cols


AGE_GROUPS = {
    'G1_7_8':   list(range(1, 13)) + list(range(14, 18)) + [22, 23, 30],
    'G2_9_11':  list(range(1, 21)) + [22, 23, 24] + list(range(26, 29)) + [30],
    'G3_12_17': list(range(1, 29)) + [30, 31, 32],
}

AGE_FILTERS = {
    'G1_7_8':   (df['Age'] >= 7)  & (df['Age'] <= 8),
    'G2_9_11':  (df['Age'] >= 9)  & (df['Age'] <= 11),
    'G3_12_17': (df['Age'] >= 12) & (df['Age'] <= 17),
}

print('\nAge-group summary (corrected feature sets):')
for g, qs in AGE_GROUPS.items():
    n = AGE_FILTERS[g].sum()
    dys = df.loc[AGE_FILTERS[g], 'label'].sum()
    n_feat = len(get_feature_cols(qs))
    print(f'  {g}: {n:4d} participants | {dys:3d} dyslexia ({dys/n*100:.1f}%) | {n_feat} features')


# ── 4. Pipeline ───────────────────────────────────────────────────────────────
def build_pipeline(n_estimators=300):
    return ImbPipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('smote',   SMOTE(random_state=42, k_neighbors=5)),
        ('rf',      RandomForestClassifier(
                        n_estimators=n_estimators,
                        class_weight='balanced',
                        max_features='sqrt',
                        min_samples_leaf=2,
                        random_state=42,
                        n_jobs=-1,
                    )),
    ])


def youden_threshold(y_true, y_proba):
    """
    Find threshold that maximises Youden's J = Sensitivity + Specificity - 1.
    More robust than using paper's verbatim thresholds on a different language/mechanic.
    """
    from sklearn.metrics import roc_curve
    fpr, tpr, thresholds = roc_curve(y_true, y_proba)
    j_scores = tpr - fpr
    best_idx = np.argmax(j_scores)
    return float(thresholds[best_idx]), float(j_scores[best_idx])


# ── 5. Train & Evaluate ───────────────────────────────────────────────────────
# Paper's thresholds (kept as reference but Youden's J used for final model)
PAPER_THRESHOLDS = {
    'G1_7_8':   0.255,
    'G2_9_11':  0.230,
    'G3_12_17': 0.155,
}

results       = {}
trained_models = {}

for group_name, q_list in AGE_GROUPS.items():
    print(f'\n{"="*60}')
    print(f'  {group_name}')
    print(f'{"="*60}')

    mask      = AGE_FILTERS[group_name]
    feat_cols = get_feature_cols(q_list)
    # Guard: only columns that exist in df
    feat_cols = [c for c in feat_cols if c in df.columns]

    X = df.loc[mask, feat_cols].values.astype(float)
    y = df.loc[mask, 'label'].values

    pipe = build_pipeline()
    cv   = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)

    # Out-of-fold probabilities
    y_proba = cross_val_predict(pipe, X, y, cv=cv, method='predict_proba')[:, 1]

    roc = roc_auc_score(y, y_proba)

    # Youden's J threshold
    best_thresh, best_j = youden_threshold(y, y_proba)
    paper_thresh        = PAPER_THRESHOLDS[group_name]

    print(f'ROC-AUC       : {roc:.3f}')
    print(f'Paper threshold: {paper_thresh:.3f}')
    print(f'Youden thresh  : {best_thresh:.3f}  (J={best_j:.3f})')

    y_pred_paper  = (y_proba >= paper_thresh).astype(int)
    y_pred_youden = (y_proba >= best_thresh).astype(int)

    print('\n--- With PAPER threshold ---')
    print(classification_report(y, y_pred_paper, target_names=['No Dyslexia','Dyslexia']))

    print('--- With YOUDEN threshold ---')
    print(classification_report(y, y_pred_youden, target_names=['No Dyslexia','Dyslexia']))

    # Confusion matrices side by side
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))
    for ax, (thresh, label) in zip(axes, [
        (paper_thresh, f'Paper ({paper_thresh:.3f})'),
        (best_thresh,  f'Youden ({best_thresh:.3f})'),
    ]):
        cm = confusion_matrix(y, (y_proba >= thresh).astype(int))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=['No Dys','Dys'],
                    yticklabels=['No Dys','Dys'], ax=ax)
        ax.set_title(f'{group_name} — {label}')
        ax.set_ylabel('True'); ax.set_xlabel('Predicted')
    plt.tight_layout()
    plt.savefig(f'models_v3/cm_{group_name}.png', dpi=120)
    plt.show()

    # Train final model on ALL data in this group using Youden threshold
    pipe.fit(X, y)
    trained_models[group_name] = {
        'pipeline':       pipe,
        'threshold':      best_thresh,
        'paper_threshold': paper_thresh,
        'feat_cols':      feat_cols,
        'q_list':         q_list,
        'roc':            roc,
    }

    joblib.dump(trained_models[group_name], f'models_v3/model_{group_name}.pkl')
    print(f'Saved → models_v3/model_{group_name}.pkl')

    results[group_name] = {
        'roc':            roc,
        'n':              mask.sum(),
        'thresh_paper':   paper_thresh,
        'thresh_youden':  best_thresh,
    }


# ── 6. Feature Importance ─────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(20, 5))
for ax, (group_name, m) in zip(axes, trained_models.items()):
    rf         = m['pipeline'].named_steps['rf']
    feat_names = m['feat_cols']
    importances = pd.Series(rf.feature_importances_, index=feat_names)

    # Aggregate by question number
    q_imp = {}
    for col, imp in importances.items():
        digits = ''.join(filter(str.isdigit, col))
        key = f'Q{digits}' if digits else 'Demog'
        q_imp[key] = q_imp.get(key, 0) + imp

    top = pd.Series(q_imp).nlargest(15)
    top.plot(kind='barh', ax=ax, color='steelblue')
    ax.set_title(f'{group_name}\nTop Question Importance')
    ax.invert_yaxis()

plt.tight_layout()
plt.savefig('models_v3/feature_importance.png', dpi=120)
plt.show()


# ── 7. Summary ────────────────────────────────────────────────────────────────
print('\n=== v3 Model Summary ===')
summary = pd.DataFrame(results).T
print(summary.to_string())

paper_roc = {'G1_7_8': 0.663, 'G2_9_11': 0.818, 'G3_12_17': 0.806}
print('\nROC vs paper:')
for g, row in summary.iterrows():
    delta = row['roc'] - paper_roc[g]
    print(f'  {g}: {row["roc"]:.3f}  (paper {paper_roc[g]:.3f}, Δ{delta:+.3f})')


# ── 8. Updated Inference Helper ───────────────────────────────────────────────
import joblib, numpy as np

def load_models_v3(model_dir='models_v3'):
    return {
        'G1_7_8':   joblib.load(f'{model_dir}/model_G1_7_8.pkl'),
        'G2_9_11':  joblib.load(f'{model_dir}/model_G2_9_11.pkl'),
        'G3_12_17': joblib.load(f'{model_dir}/model_G3_12_17.pkl'),
    }


def get_group(age: int) -> str:
    if 7  <= age <= 8:  return 'G1_7_8'
    if 9  <= age <= 11: return 'G2_9_11'
    if 12 <= age <= 17: return 'G3_12_17'
    raise ValueError(f'Age {age} out of supported range (7–17)')


def build_inference_features(raw: dict) -> dict:
    """
    Convert the raw payload from scoring.ts into model-ready features.

    raw keys: Gender, Nativelang, Otherlang, Age,
              Clicks1..Missrate32  (as sent by buildModelFeaturePayload)

    Applies:
      - Clip Accuracy*/Missrate* to [0,1]
      - Compute AdjAcc/AdjMiss for Q26-32
    """
    feats = dict(raw)

    # Clip accuracy columns
    for q in range(1, 33):
        for col in [f'Accuracy{q}', f'Missrate{q}']:
            if col in feats and feats[col] is not None:
                feats[col] = max(0.0, min(1.0, float(feats[col])))

    # Adjusted accuracy for broken-mechanic questions
    for q in [26, 27, 28, 30, 31, 32]:
        h = feats.get(f'Hits{q}',   0) or 0
        m = feats.get(f'Misses{q}', 0) or 0
        denom = h + m
        feats[f'AdjAcc{q}']  = (h / denom) if denom > 0 else 0.0
        feats[f'AdjMiss{q}'] = (m / denom) if denom > 0 else 0.0

    return feats


def predict_dyslexia_v3(age: int, raw_features: dict, models: dict) -> dict:
    """
    Predict dyslexia risk with corrected feature engineering.

    Parameters
    ----------
    age          : participant age (7–17)
    raw_features : dict as produced by buildModelFeaturePayload in scoring.ts
    models       : dict from load_models_v3()
    """
    group  = get_group(age)
    m      = models[group]
    pipe   = m['pipeline']
    thresh = m['threshold']
    cols   = m['feat_cols']

    feats = build_inference_features(raw_features)

    X = np.array([[feats.get(c, np.nan) for c in cols]], dtype=float)

    proba      = pipe.predict_proba(X)[0, 1]
    risk_detected = bool(proba >= thresh)

    if proba < thresh * 1.5:
        risk_level = 'low'
    elif proba < thresh * 2.5:
        risk_level = 'moderate'
    else:
        risk_level = 'high'

    return {
        'group':        group,
        'probability':  round(float(proba), 4),
        'threshold':    round(thresh, 4),
        'riskDetected': risk_detected,
        'riskLevel':    risk_level,
        'disclaimer':   (
            'This is a screening estimate only and does NOT constitute a diagnosis. '
            'Consult a qualified professional for a comprehensive assessment.'
        ),
    }


# ── Smoke test ────────────────────────────────────────────────────────────────
models_v3 = load_models_v3()

# Simulate YOUR session data to verify the fix
my_session = {
    'Gender': 0, 'Nativelang': 1, 'Otherlang': 0, 'Age': 12,  # use 12 to hit G3
    'Clicks1':19,'Hits1':18,'Misses1':1,'Score1':18,'Accuracy1':0.95,'Missrate1':0.05,
    'Clicks2':10,'Hits2':10,'Misses2':0,'Score2':10,'Accuracy2':1.0,'Missrate2':0.0,
    'Clicks3':11,'Hits3':11,'Misses3':0,'Score3':11,'Accuracy3':1.0,'Missrate3':0.0,
    'Clicks4':11,'Hits4':11,'Misses4':0,'Score4':11,'Accuracy4':1.0,'Missrate4':0.0,
    'Clicks5':9,'Hits5':9,'Misses5':0,'Score5':9,'Accuracy5':1.0,'Missrate5':0.0,
    'Clicks6':6,'Hits6':6,'Misses6':0,'Score6':6,'Accuracy6':1.0,'Missrate6':0.0,
    'Clicks7':5,'Hits7':5,'Misses7':0,'Score7':5,'Accuracy7':1.0,'Missrate7':0.0,
    'Clicks8':6,'Hits8':6,'Misses8':0,'Score8':6,'Accuracy8':1.0,'Missrate8':0.0,
    'Clicks9':8,'Hits9':8,'Misses9':0,'Score9':8,'Accuracy9':1.0,'Missrate9':0.0,
    'Clicks10':17,'Hits10':16,'Misses10':1,'Score10':16,'Accuracy10':0.94,'Missrate10':0.06,
    'Clicks11':12,'Hits11':12,'Misses11':0,'Score11':12,'Accuracy11':1.0,'Missrate11':0.0,
    'Clicks12':6,'Hits12':6,'Misses12':0,'Score12':6,'Accuracy12':1.0,'Missrate12':0.0,
    'Clicks13':8,'Hits13':8,'Misses13':0,'Score13':8,'Accuracy13':1.0,'Missrate13':0.0,
    'Clicks14':22,'Hits14':9,'Misses14':13,'Score14':9,'Accuracy14':0.41,'Missrate14':0.59,
    'Clicks15':10,'Hits15':7,'Misses15':3,'Score15':7,'Accuracy15':0.70,'Missrate15':0.30,
    'Clicks16':9,'Hits16':4,'Misses16':5,'Score16':4,'Accuracy16':0.44,'Missrate16':0.56,
    'Clicks17':24,'Hits17':7,'Misses17':17,'Score17':7,'Accuracy17':0.29,'Missrate17':0.71,
    'Clicks18':3,'Hits18':3,'Misses18':0,'Score18':3,'Accuracy18':1.0,'Missrate18':0.0,
    'Clicks19':4,'Hits19':3,'Misses19':1,'Score19':3,'Accuracy19':0.75,'Missrate19':0.25,
    'Clicks20':8,'Hits20':8,'Misses20':0,'Score20':8,'Accuracy20':1.0,'Missrate20':0.0,
    'Clicks21':12,'Hits21':6,'Misses21':6,'Score21':6,'Accuracy21':0.50,'Missrate21':0.50,
    'Clicks22':11,'Hits22':11,'Misses22':0,'Score22':11,'Accuracy22':1.0,'Missrate22':0.0,
    'Clicks23':6,'Hits23':5,'Misses23':1,'Score23':5,'Accuracy23':0.83,'Missrate23':0.17,
    'Clicks24':4,'Hits24':4,'Misses24':0,'Score24':4,'Accuracy24':1.0,'Missrate24':0.0,
    'Clicks25':4,'Hits25':3,'Misses25':1,'Score25':3,'Accuracy25':0.75,'Missrate25':0.25,
    'Clicks26':5,'Hits26':1,'Misses26':1,'Score26':1,'Accuracy26':0.20,'Missrate26':0.20,
    'Clicks27':18,'Hits27':3,'Misses27':0,'Score27':3,'Accuracy27':0.17,'Missrate27':0.0,
    'Clicks28':12,'Hits28':4,'Misses28':0,'Score28':4,'Accuracy28':0.33,'Missrate28':0.0,
    'Clicks30':16,'Hits30':4,'Misses30':0,'Score30':4,'Accuracy30':0.25,'Missrate30':0.0,
    'Clicks31':12,'Hits31':4,'Misses31':2,'Score31':4,'Accuracy31':0.33,'Missrate31':0.17,
    'Clicks32':16,'Hits32':2,'Misses32':2,'Score32':2,'Accuracy32':0.13,'Missrate32':0.13,
    # zero-fill missing questions
    **{f'{m}{q}': 0.0 for q in [29] for m in ['Clicks','Hits','Misses','Score','Accuracy','Missrate']},
}

result = predict_dyslexia_v3(age=12, raw_features=my_session, models=models_v3)
print('\n=== Smoke test (your session, age set to 12 for G3 model) ===')
for k, v in result.items():
    print(f'  {k}: {v}')
