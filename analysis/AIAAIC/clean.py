"""
AIAAIC Repository — Data Cleaning Pipeline
============================================
Reads the raw AIAAIC incidents CSV (which has a non-standard multi-row header),
normalises taxonomy fields (typos, casing, near-duplicates), adds derived columns,
and exports a cleaned CSV ready for analysis.

Usage:
    python clean.py                          # uses default paths
    python clean.py --input raw.csv --output cleaned.csv

Requirements:
    pip install pandas rapidfuzz
    (rapidfuzz is optional — falls back to difflib if missing)

Source: claude code
"""

import argparse
import csv
import re
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# 1. PARSE THE RAW FILE
#    The AIAAIC CSV has 3 header rows:
#      Row 0: "Incidents" (title row — skip)
#      Row 1: Main column names
#      Row 2: Sub-column names (Jurisdiction, Sector, Individual, Societal, Environmental)
#      Row 3+: Data
# ---------------------------------------------------------------------------

COLUMN_MAP = {
    0:  "aiaaic_id",
    1:  "headline",
    2:  "occurred",
    3:  "deployer",
    4:  "developer",
    5:  "system_name",
    6:  "technology",
    7:  "purpose",
    8:  "news_trigger",
    9:  "ethical_issue",
    10: "jurisdiction",
    11: "sector",
    12: "harm_individual",
    13: "harm_societal",
    14: "harm_environmental",
    15: "consequence",
    16: "response",
    17: "summary_link",
}


def read_raw_csv(path: str) -> pd.DataFrame:
    """Parse the AIAAIC CSV with its non-standard multi-row header."""
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        all_rows = list(reader)

    # Data starts at row 3 (0-indexed)
    records = []
    for row in all_rows[3:]:
        if len(row) < 10:
            continue
        if not row[0].strip():
            continue
        record = {}
        for idx, col_name in COLUMN_MAP.items():
            record[col_name] = row[idx].strip() if idx < len(row) else ""
        records.append(record)

    df = pd.DataFrame(records)
    print(f"  Parsed {len(df)} incidents from raw CSV")
    return df


# ---------------------------------------------------------------------------
# 2. TAXONOMY NORMALISATION MAPS
#    Hand-curated corrections for known typos and near-duplicates found
#    during exploratory analysis. Add to these as you spot new issues.
# ---------------------------------------------------------------------------

TECHNOLOGY_FIXES = {
    "Facial recgnition": "Facial recognition",
    "Facial recogniton": "Facial recognition",
    "Machine learnng": "Machine learning",
    "Deepfak": "Deepfake",
    "Pricing algorthm": "Pricing algorithm",
    "Text-to-imag": "Text-to-image",
    "Speech ecognition": "Speech recognition",
    "Speech/voice recognition": "Speech recognition",
    "Voice-to-Text": "Voice-to-text",
    "Anomaly Detection": "Anomaly detection",
    "Optical Character Recognition": "Optical character recognition",
    "Text to speech": "Text-to-speech",
    "Voice to text": "Voice-to-text",
    "Virtual reality (VR)": "Virtual reality",
    "Augmented Reality (AR)": "Augmented reality",
    "Augmented reality (AR)": "Augmented reality",
    "Image generator": "Image generation",
    "Dataset/database": "Database/dataset",
    "Deepfake - image": "Deepfake",
    "Deepfake - video": "Deepfake",
    "Behavioural monitoring system": "Behavioural monitoring",
}

ETHICS_FIXES = {
    # Typos
    "Accountabiilty": "Accountability",
    "Accountabiity": "Accountability",
    "Accuracy/relibaility": "Accuracy/reliability",
    "Accuracy/reliablity": "Accuracy/reliability",
    "Accuracy/reliabiity": "Accuracy/reliability",
    "Transaprency": "Transparency",
    "Transpareny": "Transparency",
    "Atuomation bias": "Automation bias",
    "Privacy/surveillamce": "Privacy/surveillance",
    "Privacy/surveillance/surveillance": "Privacy/surveillance",
    "Compeititon/monopolisation": "Competition/monopolisation",
    "Appropropriation": "Appropriation",
    "Accessiblity": "Accessibility",
    "Surveillanc": "Surveillance",
    "Ownership/accountability": "Accountability",
    # Merges — map standalone Privacy to the main tag
    "Privacy": "Privacy/surveillance",
    "Surveillance": "Privacy/surveillance",
    # Merge duplicate dual-use variants
    "Dual/multi-use": "Dual use",
    # Merge employment variants
    "Employment": "Employment/labour",
    "Employment - jobs": "Employment/labour",
    "Employment - jobs, pay": "Employment/labour",
    "Employment/labour - jobs": "Employment/labour",
    # Merge autonomy variants
    "Autonomy": "Autonomy/agency",
    # Composite values that were entered without semicolons
    "Safety, Transparency": "Safety; Transparency",
    "Copyright: Mis/disinformation": "Copyright; Mis/disinformation",
    "Accuracy/reliability, Fairness": "Accuracy/reliability; Fairness",
    "Security, Safety": "Security; Safety",
    "Fairness, Employment/labour": "Fairness; Employment/labour",
}

HARM_INDIVIDUAL_FIXES = {
    "Jobs loss/losses": "Job loss/losses",
    "Health detioration": "Health deterioration",
    "Reputation damage": "Reputational damage",
    "Reputatiomal damage": "Reputational damage",
    "IP/IP/copyright loss": "IP/copyright loss",
    "Autonomy loss": "Autonomy/agency loss",
    "Confidentality loss": "Confidentiality loss",
    "Harassment/abuse": "Harassment",
    # Composite values entered without semicolons
    "IP/copyright loss, Financial loss": "IP/copyright loss; Financial loss",
    "Financial loss, Reputational damage": "Financial loss; Reputational damage",
    "Personality rights loss,  Financial loss": "Personality rights loss; Financial loss",
    "Financial loss: Fraud": "Financial loss; Fraud",
}

HARM_SOCIETAL_FIXES = {
    "Jobs loss/losses": "Job loss/losses",
    "Loss of jobs": "Job loss/losses",
    "Loss of employment": "Job loss/losses",
    "Job replacements": "Job loss/losses",
    "IP/copyight loss": "IP/copyright loss",
    "Copright loss": "Copyright loss",
    "Instutional trust loss": "Institutional trust loss",
    "Societal destablisation": "Societal destabilisation",
    "Confidentality loss": "Confidentiality loss",
    "Stigmitisation": "Stigmatisation",
    "Sterotyping": "Stereotyping",
    "Anxiety distress": "Anxiety/distress",
    "Financial closs": "Financial loss",
    "Heath deterioration": "Health deterioration",
    "Loss of community well-being and cohesion": "Erosion of community wellbeing/cohesion",
    "Loss of community wellbeing/cohesion": "Erosion of community wellbeing/cohesion",
    "Manipulation/deception": "Deception/manipulation",
    "Manipulation": "Deception/manipulation",
    "Loss of critical thinking/creativity": "Creativity loss",
    "Loss of creativity/critical thinking": "Creativity loss",
    "Bodily damage": "Bodily injury",
    "Autonomy loss": "Autonomy/agency loss",
    "Social inequality": "Societal inequality",
    "Inequality": "Societal inequality",
    "Social instability": "Societal destabilisation",
    "Political polarisation": "Political polarisation/instability",
    "Damage to political systems/stability": "Political polarisation/instability",
}

CONSEQUENCE_FIXES = {
    "Fine/settement": "Fine/settlement",
    "Regulatory investigations": "Regulatory investigation",
    "Regulatory investigation/action": "Regulatory investigation",
    "Regulatory action": "Regulatory investigation",
    "Regulatory enforcement": "Regulatory investigation",
    "Regulatory enforcement action": "Regulatory investigation",
    "Police investigation/action": "Police investigation",
    "Legislative complaint/investigation": "Legislative complaint",
    "Legislative complaint/inquiry": "Legislative complaint",
    "Legislative complaints": "Legislative complaint",
    "Legislative inquiries": "Legislative complaint",
    "Legislative inquiry": "Legislative complaint",
    "Legislative questions/complaints": "Legislative complaint",
    "Legislators letter": "Legislator letter",
    "Legislators' letters": "Legislator letter",
    "Legislators enquiry": "Legislator letter",
    "Legislator questions": "Legislator letter",
    "Lawsuits": "Litigation",
    "Lawsuit filing": "Litigation",
}

TRIGGER_FIXES = {
    "Media investigation": "Media investigation/fact check",
    "Media investigation/fact check/fact check": "Media investigation/fact check",
    "Media investigation/fact checks": "Media investigation/fact check",
    "Legal treat/action": "Legal threat/action",
    "Legal action/threat": "Legal threat/action",
    "Victim comment/complaint": "Victim comments/complaints",
    "Victim statement": "Victim comments/complaints",
    "Customer comments/complaints": "User comments/complaints",
    "Researcher investigation/paper/study/report": "Research study/report",
    "Academic research/investigation": "Research study/report",
    "Researcher investigation": "Research study/report",
    "Product demonstration/release": "Product demonstration/release/launch",
    "Product demonstration": "Product demonstration/release/launch",
    "Product announcement": "Product demonstration/release/launch",
    "Developer/deployer statements": "Developer/deployer statement",
    "Deployer statement": "Developer/deployer statement",
    "Developer statement": "Developer/deployer statement",
    "Govt statement": "Government statement",
    "Government review/inquiry/investigation": "Government investigation/report",
    "Govt investigation/report": "Government investigation/report",
    "Govt report publication": "Government investigation/report",
    "Government report": "Government investigation/report",
    "NGO research report/study": "NGO investigation/campaign",
    "Non-profit investigation": "NGO investigation/campaign",
    "Regulator statement": "Regulatory threat/action",
    "Regulator investigation/action": "Regulatory threat/action",
    "Community comments/complaints": "User comments/complaints",
    "Community backlash": "User comments/complaints",
    "Resident comments/complaints": "User comments/complaints",
    "Social media comments/complaints": "User comments/complaints",
    "End user complaints/backlash": "User comments/complaints",
    "Local community comments/complaints": "User comments/complaints",
    "Tenant comments/complaints": "User comments/complaints",
    "Patient comments/complaints": "User comments/complaints",
    "Congregation complaints": "User comments/complaints",
    "Target comments/complaints": "User comments/complaints",
    "Industry comments/complaints": "Industry complaint",
}


# ---------------------------------------------------------------------------
# 3. CLEANING FUNCTIONS
# ---------------------------------------------------------------------------

def normalise_semicolon_field(value: str, fix_map: dict) -> str:
    """Split a semicolon-delimited field, apply fixes, deduplicate, rejoin."""
    if not value:
        return ""
    parts = []
    for raw in re.split(r"[;]", value):
        item = raw.strip().rstrip(";").strip()
        if not item:
            continue
        # Some composite fixes produce new semicolons — expand those
        fixed = fix_map.get(item, item)
        for sub in fixed.split(";"):
            sub = sub.strip()
            if sub:
                parts.append(sub)
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for p in parts:
        if p.lower() not in seen:
            seen.add(p.lower())
            deduped.append(p)
    return "; ".join(deduped)


def extract_year(value: str) -> int | None:
    """Extract a 4-digit year from the 'occurred' field."""
    m = re.search(r"(\d{4})", str(value))
    return int(m.group(1)) if m else None


def compute_harm_breadth(row: pd.Series) -> int:
    """Count total distinct harm tags across individual + societal + environmental."""
    total = 0
    for col in ["harm_individual", "harm_societal", "harm_environmental"]:
        val = row.get(col, "")
        if val:
            total += len([x for x in val.split(";") if x.strip()])
    return total


def classify_trigger(trigger: str) -> str:
    """Map raw trigger values into high-level detection categories."""
    if not trigger:
        return "Unknown"

    user_triggers = {
        "User comments/complaints", "Victim comments/complaints",
        "Employee comments/complaints", "Employee strikes",
        "Employee backlash", "Employee campaign",
    }
    media_triggers = {
        "Media investigation/fact check", "Media interview",
        "Media coverage", "TV broadcast", "Article publication",
    }
    research_triggers = {
        "Research study/report", "Third-party audit",
    }
    legal_triggers = {
        "Legal threat/action", "Regulatory threat/action",
        "Police threat/action", "Legislative threat/action",
    }
    industry_triggers = {
        "Developer/deployer statement", "Product demonstration/release/launch",
        "White-hat hack", "Data breach/leak", "Whistleblower complaint",
    }

    parts = [t.strip() for t in trigger.split(";")]
    for t in parts:
        if t in legal_triggers:
            return "Legal/regulatory"
    for t in parts:
        if t in user_triggers:
            return "User-driven"
    for t in parts:
        if t in media_triggers:
            return "Media"
    for t in parts:
        if t in research_triggers:
            return "Research"
    for t in parts:
        if t in industry_triggers:
            return "Industry/developer"
    return "Other"


def classify_fairness_subtype(ethics: str) -> str | None:
    """Extract fairness protected-characteristic subtypes if present."""
    if not ethics:
        return None
    parts = [e.strip() for e in ethics.split(";")]
    subtypes = []
    for p in parts:
        if p.startswith("Fairness -"):
            chars = p.replace("Fairness -", "").strip()
            for c in re.split(r"[,]", chars):
                c = c.strip().lower()
                if c:
                    subtypes.append(c)
    return "; ".join(sorted(set(subtypes))) if subtypes else None


# ---------------------------------------------------------------------------
# 4. MAIN PIPELINE
# ---------------------------------------------------------------------------

def clean(input_path: str, output_path: str) -> pd.DataFrame:
    print(f"\n{'='*60}")
    print("AIAAIC Data Cleaning Pipeline")
    print(f"{'='*60}")

    # --- Read ---
    print(f"\n[1/6] Reading raw CSV: {input_path}")
    df = read_raw_csv(input_path)

    # --- Normalise taxonomy fields ---
    print("[2/6] Normalising taxonomy fields (typos, near-duplicates)...")
    fix_pairs = [
        ("technology",        TECHNOLOGY_FIXES),
        ("ethical_issue",     ETHICS_FIXES),
        ("harm_individual",   HARM_INDIVIDUAL_FIXES),
        ("harm_societal",     HARM_SOCIETAL_FIXES),
        ("consequence",       CONSEQUENCE_FIXES),
        ("news_trigger",      TRIGGER_FIXES),
    ]
    for col, fix_map in fix_pairs:
        before = df[col].nunique()
        df[col] = df[col].apply(lambda v: normalise_semicolon_field(v, fix_map))
        after = df[col].nunique()
        print(f"    {col}: {before} → {after} unique values")

    # --- Derived columns ---
    print("[3/6] Adding derived columns...")
    df["year"] = df["occurred"].apply(extract_year)
    df["harm_breadth"] = df.apply(compute_harm_breadth, axis=1)
    df["has_consequence"] = df["consequence"].apply(lambda v: bool(v.strip()))
    df["has_response"] = df["response"].apply(lambda v: bool(v.strip()))
    df["detection_category"] = df["news_trigger"].apply(classify_trigger)
    df["fairness_subtypes"] = df["ethical_issue"].apply(classify_fairness_subtype)

    # --- Technology convenience flags ---
    print("[4/6] Adding technology flags...")
    tech_flags = [
        "Generative AI", "Facial recognition", "Deepfake",
        "Machine learning", "Computer vision", "Self-driving system",
        "Agentic AI", "Large language model",
    ]
    for tech in tech_flags:
        col_name = "is_" + re.sub(r"[^a-z0-9]+", "_", tech.lower()).strip("_")
        df[col_name] = df["technology"].str.contains(re.escape(tech), case=False, na=False)

    # --- Quality flags ---
    print("[5/6] Adding data quality flags...")
    df["has_harm_data"] = (df["harm_individual"].str.strip().astype(bool)) | \
                          (df["harm_societal"].str.strip().astype(bool)) | \
                          (df["harm_environmental"].str.strip().astype(bool))
    df["has_developer"] = df["developer"].str.strip().astype(bool)
    df["is_partial_year"] = df["year"].isin([2026])

    # --- Export ---
    print(f"[6/6] Exporting cleaned CSV: {output_path}")
    df.to_csv(output_path, index=False)

    # --- Summary ---
    print(f"\n{'='*60}")
    print("Cleaning summary")
    print(f"{'='*60}")
    print(f"  Total incidents: {len(df)}")
    print(f"  Year range: {df['year'].min()}–{df['year'].max()}")
    print(f"  With harm data: {df['has_harm_data'].sum()} ({df['has_harm_data'].mean()*100:.1f}%)")
    print(f"  With consequence: {df['has_consequence'].sum()} ({df['has_consequence'].mean()*100:.1f}%)")
    print(f"  With response: {df['has_response'].sum()} ({df['has_response'].mean()*100:.1f}%)")
    print(f"  GenAI incidents: {df['is_generative_ai'].sum()}")
    print(f"\n  Detection categories:")
    for cat, count in df["detection_category"].value_counts().items():
        print(f"    {cat}: {count}")
    print(f"\n✅ Done. Open '{output_path}' or run explore.py next.\n")

    return df


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean AIAAIC incident data")
    parser.add_argument("--input", default="AIAAIC Repository - Incidents.csv",
                        help="Path to raw AIAAIC CSV")
    parser.add_argument("--output", default="aiaaic_cleaned.csv",
                        help="Path for cleaned output CSV")
    args = parser.parse_args()

    clean(args.input, args.output)
