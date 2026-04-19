import pandas as pd


def detect_address_anomalies(df, threshold=10):

    df = df.copy()

    df["State"] = df["State"].astype(str).str.lower().str.strip()
    df["City"] = df["City"].astype(str).str.lower().str.strip()
    df["Address"] = df["Address"].astype(str).str.lower().str.strip()

    df["address_key"] = (
        df["State"] + "|" +
        df["City"] + "|" +
        df["Address"]
    )

    counts = (
        df.groupby("address_key")
        .size()
        .reset_index(name="voter_count")
    )

    suspicious = counts[counts["voter_count"] > threshold]

    return suspicious.to_dict(orient="records")