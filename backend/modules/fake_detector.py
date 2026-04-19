import re
import numpy as np
import pandas as pd
from datetime import date

DAYFIRST = True
MIN_AGE = 18
MAX_AGE = 100
AGE_TOLERANCE_YEARS = 1


def norm_text(x):
    if pd.isna(x):
        return ""
    return re.sub(r"\s+", " ", str(x).lower().strip())


def compute_age_from_dob(dob):
    d = pd.to_datetime(dob, errors="coerce", dayfirst=DAYFIRST)
    if pd.isna(d):
        return np.nan

    today = date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


def check_name(name):
    name = norm_text(name)
    if name == "":
        return ["Name missing"]
    if re.fullmatch(r"[^\w]+", name):
        return ["Invalid placeholder name"]
    if "?" in name or name in {"na", "n/a", "null", "unknown", "xxx"}:
        return ["Invalid placeholder name"]
    if re.search(r"\d", name):
        return ["Name contains digits"]
    return []


def check_age(age):
    if pd.isna(age):
        return ["Age missing"]

    age = int(age)

    if age < MIN_AGE or age > MAX_AGE:
        return ["Age out of valid range"]

    return []


def check_dob(age, dob):
    dob_age = compute_age_from_dob(dob)

    if pd.isna(dob_age):
        return ["Invalid DOB"]

    if abs(age - dob_age) > AGE_TOLERANCE_YEARS:
        return ["Age-DOB mismatch"]

    return []


def label_row(row):

    reasons = []

    reasons += check_name(row.get("Name"))
    reasons += check_age(row.get("Age"))
    reasons += check_dob(row.get("Age"), row.get("DOB"))

    return list(set(reasons))
