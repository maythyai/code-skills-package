# Model QA — Statistical Methods Reference

## Population Stability Index (PSI)

```python
import numpy as np
import pandas as pd

def compute_psi(expected: pd.Series, actual: pd.Series, bins: int = 10) -> float:
    """
    < 0.10 → No significant shift (green)
    0.10–0.25 → Moderate shift, investigate (amber)
    >= 0.25 → Significant shift, action required (red)
    """
    breakpoints = np.linspace(0, 100, bins + 1)
    expected_pcts = np.percentile(expected.dropna(), breakpoints)
    expected_counts = np.histogram(expected, bins=expected_pcts)[0]
    actual_counts = np.histogram(actual, bins=expected_pcts)[0]
    exp_pct = (expected_counts + 1) / (expected_counts.sum() + bins)
    act_pct = (actual_counts + 1) / (actual_counts.sum() + bins)
    return round(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)), 6)
```

## Discrimination Metrics

```python
from sklearn.metrics import roc_auc_score
from scipy.stats import ks_2samp

def discrimination_report(y_true, y_score) -> dict:
    auc = roc_auc_score(y_true, y_score)
    gini = 2 * auc - 1
    ks_stat, ks_pval = ks_2samp(y_score[y_true == 1], y_score[y_true == 0])
    return {"AUC": round(auc, 4), "Gini": round(gini, 4), "KS": round(ks_stat, 4)}
```

## Hosmer-Lemeshow Calibration Test

```python
from scipy.stats import chi2

def hosmer_lemeshow_test(y_true, y_pred, groups=10) -> dict:
    data = pd.DataFrame({"y": y_true, "p": y_pred})
    data["bucket"] = pd.qcut(data["p"], groups, duplicates="drop")
    agg = data.groupby("bucket", observed=True).agg(
        n=("y", "count"), observed=("y", "sum"), expected=("p", "sum"))
    hl_stat = (((agg["observed"] - agg["expected"]) ** 2) /
               (agg["expected"] * (1 - agg["expected"] / agg["n"]))).sum()
    p_value = 1 - chi2.cdf(hl_stat, len(agg) - 2)
    return {"HL_statistic": round(hl_stat, 4), "p_value": round(p_value, 6), "calibrated": p_value >= 0.05}
```

## SHAP Feature Importance

```python
import shap

def shap_global_analysis(model, X, output_dir="."):
    try:
        explainer = shap.TreeExplainer(model)
    except Exception:
        explainer = shap.KernelExplainer(model.predict_proba, shap.sample(X, 100))
    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    shap.summary_plot(shap_values, X, show=False)
    shap.summary_plot(shap_values, X, plot_type="bar", show=False)
    return pd.DataFrame({
        "feature": X.columns,
        "mean_abs_shap": np.abs(shap_values).mean(axis=0),
    }).sort_values("mean_abs_shap", ascending=False)
```

## Variable Stability Monitor

```python
def variable_stability_report(df, date_col, variables, psi_threshold=0.25):
    periods = sorted(df[date_col].unique())
    baseline = df[df[date_col] == periods[0]]
    results = []
    for var in variables:
        for period in periods[1:]:
            current = df[df[date_col] == period]
            psi = compute_psi(baseline[var], current[var])
            results.append({"variable": var, "period": period, "psi": psi,
                "flag": "🔴" if psi >= psi_threshold else ("🟡" if psi >= 0.10 else "🟢")})
    return pd.DataFrame(results).pivot_table(index="variable", columns="period", values="psi").round(4)
```
