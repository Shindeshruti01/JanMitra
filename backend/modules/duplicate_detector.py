import pandas as pd
import numpy as np
import networkx as nx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class DuplicateDetector:

    def __init__(self, threshold=0.85):
        self.threshold = threshold
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english'
        )

    # -------------------------------------------------
    # STEP 1: Preprocess
    # -------------------------------------------------
    def preprocess(self, df):

        df = df.copy()
        df["Name"] = df["Name"].astype(str).str.lower().str.strip()
        df["City"] = df["City"].astype(str).str.lower().str.strip()
        df["Address"] = df["Address"].astype(str).str.lower().str.strip()
        df["Gender"] = df["Gender"].astype(str).str.lower().str.strip()
        df["DOB"] = pd.to_datetime(df["DOB"], errors='coerce').astype(str)

        # Combine important fields
        df["combined"] = (
            df["Name"] + " " +
            df["Gender"] + " " +
            df["City"] + " " +
            df["Address"] + " " +
            df["DOB"]
        )

        return df

    # -------------------------------------------------
    # STEP 2: Blocking (Optimization)
    # -------------------------------------------------
    def create_blocks(self, df):

        # First letter of name + birth year
        df["block_key"] = (
            df["Name"].str[0] + "_" +
            df["DOB"].str[:4]
        )

        return df.groupby("block_key")

    # -------------------------------------------------
    # STEP 3: Process Each Block
    # -------------------------------------------------
    def process_block(self, block_df):

        if len(block_df) < 2:
            return [], None

        texts = block_df["combined"].tolist()

        tfidf_matrix = self.vectorizer.fit_transform(texts)
        similarity_matrix = cosine_similarity(tfidf_matrix)

        G = nx.Graph()

        for i in range(len(block_df)):
            G.add_node(i)

        for i in range(len(block_df)):
            for j in range(i + 1, len(block_df)):

                score = similarity_matrix[i][j]

                # Strong rule: If Aadhar same → duplicate
                if block_df.iloc[i]["Aadhar"] == block_df.iloc[j]["Aadhar"]:
                    G.add_edge(i, j)

                # DOB exact match + high similarity
                elif (
                    block_df.iloc[i]["DOB"] == block_df.iloc[j]["DOB"]
                    and score >= self.threshold
                ):
                    G.add_edge(i, j)

        duplicate_groups = []

        for component in nx.connected_components(G):
            if len(component) > 1:
                group = block_df.iloc[list(component)].to_dict(orient="records")
                duplicate_groups.append(group)

        return duplicate_groups, similarity_matrix

    # -------------------------------------------------
    # MAIN FUNCTION
    # -------------------------------------------------
    def find_duplicates(self, df):

        df = self.preprocess(df)
        blocks = self.create_blocks(df)

        all_duplicates = []

        for block_name, block_df in blocks:
            duplicates, sim_matrix = self.process_block(block_df)

            if duplicates:
                print(f"\n🔎 Block: {block_name}")
                print("Similarity Matrix:\n", np.round(sim_matrix, 2))
                all_duplicates.extend(duplicates)

        return all_duplicates


# =====================================================
# MAIN EXECUTION
# =====================================================

if __name__ == "__main__":

    print("\n==============================")
    print(" VOTER DUPLICATE DETECTION (WITH DOB)")
    print("==============================")

    file_path = "/content/voterupdatesql_updated.csv"
    df = pd.read_csv(file_path)

    print(f"\n✅ Dataset Loaded: {len(df)} records")

    detector = DuplicateDetector(threshold=0.85)

    duplicates = detector.find_duplicates(df)

    print("\n==============================")
    print(" DUPLICATE GROUPS FOUND ")
    print("==============================\n")

    if not duplicates:
        print("✅ No duplicates found.")
    else:
        group_id = 1
        duplicate_list = []

        for group in duplicates:
            print(f"✅ Group {group_id}:")
            for record in group:
                print(
                    f"   Voter_ID: {record['Voter_ID']} | "
                    f"Name: {record['Name']} | "
                    f"DOB: {record['DOB']} | "
                    f"Aadhar: {record['Aadhar']}"
                )

                duplicate_list.append({
                    "group_id": group_id,
                    "Voter_ID": record["Voter_ID"],
                    "Name": record["Name"],
                    "DOB": record["DOB"],
                    "Aadhar": record["Aadhar"]
                })

            print()
            group_id += 1

        # Save duplicate results
        pd.DataFrame(duplicate_list).to_csv(
            "detected_duplicates.csv",
            index=False
        )

        print("✅ Duplicate results saved to detected_duplicates.csv")
