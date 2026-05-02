# %% [markdown]
# # Lexora v3 — Corrected Dyslexia Screening Pipeline (Colab)
#
# ## Fixes vs original notebook
# | Fix | What | Why |
# |-----|------|-----|
# | 1 | Clip all Accuracy & Missrate to [0, 1] | Raw CSV contains values up to 875 (div-by-zero artifact in Dytective export) |
# | 2 | AdjAcc = Hits/(Hits+Misses) for Q26, Q27, Q28, Q30, Q31, Q32 | Raw Accuracy = Hits/Clicks is structurally misleading for these interaction types |
# | 3 | Threshold via Youden's J (OOF CV) instead of paper's verbatim values | Paper threshold 0.155 for G3 is too aggressive on English/Arabic adaptation |
#
# **Note:** Q14–Q17 Accuracy/Missrate are kept — cycling-variant mechanic was
# present in the original deployed Spanish test, so training data used the same
# mechanic and those features are valid.

# %% [markdown]
# ## 0. Environment Setup

# %%
# Run this cell first on Colab
import subprocess, sys
subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                "imbalanced-learn", "scikit-learn", "pandas", "numpy",
                "matplotlib", "seaborn", "joblib"])

# %%
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
    roc_auc_score, roc_curve
)
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

os.makedirs('models_v3', exist_ok=True)
print('Environment ready ✓')

# %% [markdown]
# ## 1. Upload Data
#
# Upload `Dyt-desktop.csv` and `Dyt-tablet.csv` using the cell below,
# or mount Google Drive and update the paths.

# %%
# --- Option A: Upload files manually (Colab file picker) ---
from google.colab import files
uploaded = files.upload()   # pick Dyt-desktop.csv and Dyt-tablet.csv

DESKTOP_PATH = 'Dyt-desktop.csv'
TABLET_PATH  = 'Dyt-tablet.csv'

# --- Option B: Mount Drive (comment out Option A, uncomment below) ---
# from google.colab import drive
# drive.mount('/content/drive')
# DESKTOP_PATH = '/content/drive/MyDrive/Eglex/Dyt-desktop.csv'
# TABLET_PATH  = '/content/drive/MyDrive/Eglex/Dyt-tablet.csv'

# %% [markdown]
# ## 2. Load & Combine

# %%
desktop = pd.read_csv(DESKTOP_PATH, sep=';')
tablet  = pd.read_csv(TABLET_PATH,  sep=';')
desktop['source'] = 'desktop'
tablet['source']  = 'tablet'

df = pd.concat([desktop, tablet], ignore_index=True)
df.replace('NULL', np.nan, inplace=True)
df['label'] = (df['Dyslexia'] == 'Yes').astype(int)

print(f'Combined dataset: {df.shape}')
print(df['label'].value_counts().rename({0: 'No Dyslexia', 1: 'Dyslexia'}))
print(f'\nAge range: {df["Age"].min()}–{df["Age"].max()}')

# %% [markdown]
# ## 3. Preprocessing & Feature Fixes

# %%
# Encode demographics
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

# ── FIX 1: Clip Accuracy & Missrate to [0, 1] ────────────────────────────────
acc_cols  = [f'Accuracy{q}'  for q in ALL_QS if f'Accuracy{q}'  in df.columns]
miss_cols = [f'Missrate{q}'  for q in ALL_QS if f'Missrate{q}'  in df.columns]

before_max = df[acc_cols].max().max()
df[acc_cols]  = df[acc_cols].clip(0, 1)
df[miss_cols] = df[miss_cols].clip(0, 1)
print(f'Fix 1 — Accuracy clipped:  was max={before_max:.1f}, now max={df[acc_cols].max().max():.3f}')

# Show how many rows were affected
n_corrupted = (df[acc_cols] > 1).any(axis=1).sum()
print(f'          Rows with corrupted accuracy: {n_corrupted}')

# ── FIX 2: AdjAcc = Hits/(Hits+Misses) for broken-mechanic questions ─────────
# Q26 (letterReplacement):  2 clicks per attempt → raw Accuracy ≈ 0.5 × true rate
# Q27 (letterArrangement):  intermediate tile taps inflate Clicks
# Q28 (syllableArrangement): same as Q27
# Q30-32 (typedSequenceRecall): keystrokes inflate Clicks vs per-round outcomes
ADJ_QS = [26, 27, 28, 30, 31, 32]

for q in ADJ_QS:
    h = df.get(f'Hits{q}',   pd.Series(np.nan, index=df.index))
    m = df.get(f'Misses{q}', pd.Series(np.nan, index=df.index))
    denom = h + m
    df[f'AdjAcc{q}']  = np.where(denom > 0, h / denom, 0.0)
    df[f'AdjMiss{q}'] = np.where(denom > 0, m / denom, 0.0)

print(f'\nFix 2 — AdjAcc columns created for Q{ADJ_QS}')
print(df[[f'AdjAcc{q}' for q in ADJ_QS]].describe().loc[['min', 'mean', 'max']].round(3))

# %% [markdown]
# ## 4. Age-Group & Feature Configuration

# %%
# Q14-17: Accuracy/Missrate KEPT — cycling mechanic was in original Spanish test
# Q26-32: use AdjAcc/AdjMiss instead of raw Accuracy/Missrate

BASE_MEASURES     = ['Clicks', 'Hits', 'Misses', 'Score']
FULL_MEASURES     = BASE_MEASURES + ['Accuracy', 'Missrate']
ADJUSTED_MEASURES = BASE_MEASURES + ['AdjAcc', 'AdjMiss']
ADJ_QS_SET        = set(ADJ_QS)


def get_feature_cols(q_list):
    cols = ['Gender', 'Nativelang', 'Otherlang', 'Age']
    for q in q_list:
        measures = ADJUSTED_MEASURES if q in ADJ_QS_SET else FULL_MEASURES
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

print('Age-group summary:')
for g, qs in AGE_GROUPS.items():
    n   = AGE_FILTERS[g].sum()
    dys = df.loc[AGE_FILTERS[g], 'label'].sum()
    nf  = len(get_feature_cols(qs))
    print(f'  {g}: {n:4d} participants | {dys:3d} dyslexia ({dys/n*100:.1f}%) | {nf} features')

# %% [markdown]
# ## 5. Pipeline & Threshold Helper

# %%
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
    """Threshold maximising Sensitivity + Specificity - 1."""
    fpr, tpr, thresholds = roc_curve(y_true, y_proba)
    j = tpr - fpr
    idx = np.argmax(j)
    return float(thresholds[idx]), float(j[idx])


PAPER_THRESHOLDS = {
    'G1_7_8':   0.255,
    'G2_9_11':  0.230,
    'G3_12_17': 0.155,
}

# %% [markdown]
# ## 6. Train & Evaluate — One Model per Age Group

# %%
results        = {}
trained_models = {}

for group_name, q_list in AGE_GROUPS.items():
    print(f'\n{"="*60}\n  {group_name}\n{"="*60}')

    mask      = AGE_FILTERS[group_name]
    feat_cols = [c for c in get_feature_cols(q_list) if c in df.columns]

    X = df.loc[mask, feat_cols].values.astype(float)
    y = df.loc[mask, 'label'].values

    pipe  = build_pipeline()
    cv    = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
    y_proba = cross_val_predict(pipe, X, y, cv=cv, method='predict_proba')[:, 1]

    roc = roc_auc_score(y, y_proba)
    best_thresh, best_j = youden_threshold(y, y_proba)
    paper_thresh        = PAPER_THRESHOLDS[group_name]

    print(f'ROC-AUC        : {roc:.3f}')
    print(f'Paper threshold: {paper_thresh:.3f}')
    print(f'Youden threshold: {best_thresh:.3f}  (J={best_j:.3f})')

    print('\n--- Paper threshold ---')
    print(classification_report(
        y, (y_proba >= paper_thresh).astype(int),
        target_names=['No Dyslexia', 'Dyslexia']))

    print('--- Youden threshold ---')
    print(classification_report(
        y, (y_proba >= best_thresh).astype(int),
        target_names=['No Dyslexia', 'Dyslexia']))

    # Confusion matrices
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))
    for ax, (thresh, label) in zip(axes, [
        (paper_thresh, f'Paper ({paper_thresh:.3f})'),
        (best_thresh,  f'Youden ({best_thresh:.3f})'),
    ]):
        cm = confusion_matrix(y, (y_proba >= thresh).astype(int))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=['No Dys', 'Dys'],
                    yticklabels=['No Dys', 'Dys'], ax=ax)
        ax.set_title(f'{group_name} — {label}')
        ax.set_ylabel('True'); ax.set_xlabel('Predicted')
    plt.tight_layout()
    plt.savefig(f'models_v3/cm_{group_name}.png', dpi=120)
    plt.show()

    # Train final model on ALL group data
    pipe.fit(X, y)
    trained_models[group_name] = {
        'pipeline':        pipe,
        'threshold':       best_thresh,
        'paper_threshold': paper_thresh,
        'feat_cols':       feat_cols,
        'q_list':          q_list,
        'roc':             roc,
    }
    joblib.dump(trained_models[group_name], f'models_v3/model_{group_name}.pkl')
    print(f'Saved → models_v3/model_{group_name}.pkl')

    results[group_name] = {
        'roc': roc, 'n': mask.sum(),
        'thresh_paper': paper_thresh, 'thresh_youden': best_thresh,
    }

# %% [markdown]
# ## 7. Feature Importance

# %%
fig, axes = plt.subplots(1, 3, figsize=(20, 5))
for ax, (gname, m) in zip(axes, trained_models.items()):
    rf   = m['pipeline'].named_steps['rf']
    imps = pd.Series(rf.feature_importances_, index=m['feat_cols'])
    q_imp = {}
    for col, imp in imps.items():
        digits = ''.join(filter(str.isdigit, col))
        key = f'Q{digits}' if digits else 'Demog'
        q_imp[key] = q_imp.get(key, 0) + imp
    pd.Series(q_imp).nlargest(15).plot(kind='barh', ax=ax, color='steelblue')
    ax.set_title(f'{gname}\nTop Question Importance')
    ax.invert_yaxis()
plt.tight_layout()
plt.savefig('models_v3/feature_importance.png', dpi=120)
plt.show()

# %% [markdown]
# ## 8. Summary

# %%
print('\n=== v3 Model Summary ===')
summary = pd.DataFrame(results).T
print(summary.to_string())

paper_roc = {'G1_7_8': 0.663, 'G2_9_11': 0.818, 'G3_12_17': 0.806}
print('\nROC vs paper:')
for g, row in summary.iterrows():
    delta = float(row['roc']) - paper_roc[g]
    print(f'  {g}: {float(row["roc"]):.3f}  (paper={paper_roc[g]:.3f}, Δ{delta:+.3f})')

# %% [markdown]
# ## 9. Updated Inference Helper
#
# Use `build_inference_features()` + `predict_dyslexia_v3()` in your FastAPI
# endpoint as a drop-in replacement for the current predictor.

# %%
def build_inference_features(raw: dict) -> dict:
    """
    Convert scoring.ts payload into model-ready features.
    Applies Fix 1 (clip) and Fix 2 (AdjAcc) at inference time.
    """
    feats = dict(raw)

    # Fix 1: clip accuracy columns
    for q in range(1, 33):
        for col in [f'Accuracy{q}', f'Missrate{q}']:
            v = feats.get(col)
            if v is not None:
                feats[col] = max(0.0, min(1.0, float(v)))

    # Fix 2: adjusted accuracy for Q26-32
    for q in [26, 27, 28, 30, 31, 32]:
        h = float(feats.get(f'Hits{q}',   0) or 0)
        m = float(feats.get(f'Misses{q}', 0) or 0)
        denom = h + m
        feats[f'AdjAcc{q}']  = (h / denom) if denom > 0 else 0.0
        feats[f'AdjMiss{q}'] = (m / denom) if denom > 0 else 0.0

    return feats


def get_group(age: int) -> str:
    if 7  <= age <= 8:  return 'G1_7_8'
    if 9  <= age <= 11: return 'G2_9_11'
    if 12 <= age <= 17: return 'G3_12_17'
    raise ValueError(f'Age {age} out of supported range (7–17)')


def predict_dyslexia_v3(age: int, raw_features: dict, models: dict) -> dict:
    group  = get_group(age)
    m      = models[group]
    thresh = m['threshold']
    cols   = m['feat_cols']

    feats = build_inference_features(raw_features)
    X     = np.array([[feats.get(c, np.nan) for c in cols]], dtype=float)
    proba = m['pipeline'].predict_proba(X)[0, 1]

    if proba < thresh * 1.5:   risk = 'low'
    elif proba < thresh * 2.5: risk = 'moderate'
    else:                      risk = 'high'

    return {
        'group':        group,
        'probability':  round(float(proba), 4),
        'threshold':    round(thresh, 4),
        'riskDetected': bool(proba >= thresh),
        'riskLevel':    risk,
    }


# ── Smoke test: your own session ─────────────────────────────────────────────
my_session = {
    'Gender': 0, 'Nativelang': 1, 'Otherlang': 0, 'Age': 12,
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
    'Clicks29':0,'Hits29':0,'Misses29':0,'Score29':0,'Accuracy29':0.0,'Missrate29':0.0,
    'Clicks30':16,'Hits30':4,'Misses30':0,'Score30':4,'Accuracy30':0.25,'Missrate30':0.0,
    'Clicks31':12,'Hits31':4,'Misses31':2,'Score31':4,'Accuracy31':0.33,'Missrate31':0.17,
    'Clicks32':16,'Hits32':2,'Misses32':2,'Score32':2,'Accuracy32':0.13,'Missrate32':0.13,
}

result = predict_dyslexia_v3(age=12, raw_features=my_session, models=trained_models)
print('\n=== Smoke test — your session (age mapped to 12 → G3 model) ===')
for k, v in result.items():
    print(f'  {k}: {v}')

# %% [markdown]
# ## 10. Download Models from Colab

# %%
# Zip and download the trained models
import shutil
shutil.make_archive('models_v3', 'zip', 'models_v3')
from google.colab import files
files.download('models_v3.zip')
