import os

from flask import Flask, jsonify, request
from flask_cors import CORS
import bcrypt
import jwt
import datetime

from modules.duplicate_detector import DuplicateDetector
from modules.fake_detector import label_row
from modules.address_detector import detect_address_anomalies

from database import (
    load_voters,
    load_verified_voters,
    get_user_by_username,
    get_voter_profile_by_username,
    get_voter_by_voter_id,
    get_voter_by_aadhar,
    get_voter_by_name_and_aadhar,
    create_voter,
    create_new_user,
    generate_voter_id,
    update_voter_status,
    save_verified_voter,
    delete_voter_record,
    delete_voter_only,
    update_user_review_decision,
    verified_voter_exists
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "your_secret_key_change_this_in_production")


def build_suggested_action(reasons):
    reasons = reasons or []

    if any("Age-DOB mismatch" in reason for reason in reasons):
        return "Request updated proof and verify the DOB against the voter record."
    if any("Invalid DOB" in reason for reason in reasons):
        return "Check the submitted date of birth document and correct the voter profile if needed."
    if any("Invalid placeholder name" in reason for reason in reasons):
        return "Review the original source form and replace the placeholder name with the actual voter name."
    if any("Name contains digits" in reason for reason in reasons):
        return "Verify the voter name manually and correct any OCR or manual-entry issue."
    if any("Age out of valid range" in reason for reason in reasons):
        return "Validate the voter age with DOB and registration proof before approval."

    return "Review the full voter record manually and verify it against the submitted supporting documents."


def build_review_message(review_status, reason=""):
    if review_status == "Verified":
        return "Your voter record was verified by the election officer and moved to the clean verified dataset."
    if review_status == "Rejected":
        return f"Your voter record was rejected by the election officer. Reason: {reason or 'Administrative review decision.'}"
    if review_status == "Duplicate Removed":
        return f"Your duplicate voter record was removed during verification. Reason: {reason or 'Duplicate entry detected.'}"
    return reason or "Your voter record review was updated."


@app.route("/")
def home():
    return {"message": "Voter AI Backend Running"}


# ----------------------
# LOGIN API
# ----------------------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")
    role = data.get("role")

    if not username or not password or not role:
        return jsonify({"message": "Username, password and role are required"}), 400

    user = get_user_by_username(username)

    if not user:
        return jsonify({"message": "User not found"}), 404

    # Check password hash
    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"message": "Invalid password"}), 401

    # Check role
    if user["role"] != role:
        return jsonify({"message": "Unauthorized role access"}), 403

    # Generate JWT token
    token = jwt.encode(
        {
            "user_id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({
        "message": "Login successful",
        "token": token,
        "role": user["role"],
        "username": user["username"]
    }), 200

# ----------------------
# NEW VOTER REGISTRATION
# ----------------------
@app.route("/api/check-username", methods=["POST"])
def check_username():
    data = request.get_json()

    username = data.get("username")

    if not username:
        return jsonify({"message": "Username is required"}), 400

    existing_user = get_user_by_username(username)
    if existing_user:
        return jsonify({"message": "Username already exists. Please choose another username"}), 409

    return jsonify({"message": "Username is available"}), 200


@app.route("/api/register-voter", methods=["POST"])
def register_voter():
    data = request.get_json()

    name = data.get("Name")
    age = data.get("Age")
    dob = data.get("DOB")
    gender = data.get("Gender")
    city = data.get("City")
    state = data.get("State")
    address = data.get("Address")
    aadhar = data.get("Aadhar")
    username = data.get("username")
    password = data.get("password")

    # Required field validation
    if not all([name, age, dob, gender, city, state, address, aadhar, username, password]):
        return jsonify({"message": "All fields are required"}), 400

    existing_user = get_user_by_username(username)
    if existing_user:
        if existing_user["role"] != "voter":
            return jsonify({"message": "This username is reserved for another role"}), 403
        return jsonify({"message": "Username already exists. Please choose another username"}), 409

    existing_aadhar = get_voter_by_aadhar(aadhar)
    if existing_aadhar:
        return jsonify({"message": "Registered already. A voter with this Aadhar exists."}), 409

    existing_name_aadhar = get_voter_by_name_and_aadhar(name, aadhar)
    if existing_name_aadhar:
        return jsonify({"message": "Registered already. This voter already exists."}), 409

    try:
        voter_id = generate_voter_id()

        while get_voter_by_voter_id(voter_id):
            voter_id = generate_voter_id()

        voter_data = {
            "Voter_ID": voter_id,
            "Name": name,
            "Age": age,
            "DOB": dob,
            "Gender": gender,
            "City": city,
            "State": state,
            "Address": address,
            "Aadhar": aadhar,
            "status": "Pending"
        }

        create_voter(voter_data)
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        create_new_user(username, password_hash, "voter", voter_id)
    except Exception as exc:
        return jsonify({"message": f"Registration failed: {str(exc)}"}), 500

    return jsonify({
        "message": "New voter registered successfully",
        "voter_id": voter_id
    }), 201


@app.route("/api/profile/<username>", methods=["GET"])
def profile(username):
    user_profile = get_voter_profile_by_username(username)

    if not user_profile:
        return jsonify({"message": "Profile not found"}), 404

    return jsonify({
        "username": user_profile["username"],
        "role": user_profile["role"],
        "voterId": user_profile["voter_id"],
        "name": user_profile.get("Name"),
        "age": user_profile.get("Age"),
        "dob": user_profile.get("DOB"),
        "gender": user_profile.get("Gender"),
        "city": user_profile.get("City"),
        "state": user_profile.get("State"),
        "address": user_profile.get("Address"),
        "aadhar": user_profile.get("Aadhar"),
        "status": user_profile.get("review_status") or user_profile.get("status") or ("Registered" if user_profile.get("voter_id") else "Not Registered"),
        "reviewMessage": user_profile.get("review_message") or ""
    }), 200
# ----------------------
# ALL VOTERS
# ----------------------
@app.route("/api/voters")
def voters():
    df = load_voters()
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/verified-voters")
def verified_voters():
    df = load_verified_voters()
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/voters/<voter_id>/status", methods=["PUT"])
def change_voter_status(voter_id):
    data = request.get_json() or {}
    status = data.get("status")

    if status not in {"Pending", "Registered"}:
        return jsonify({"message": "Valid status is required"}), 400

    updated = update_voter_status(voter_id, status)

    if not updated:
        return jsonify({"message": "Voter not found"}), 404

    return jsonify({"message": f"Voter status updated to {status}"}), 200


@app.route("/api/voters/<voter_id>/register-clean", methods=["POST"])
def register_clean_voter(voter_id):
    try:
        voter = get_voter_by_voter_id(voter_id)
        if not voter:
            return jsonify({"message": "Voter not found"}), 404

        existing_clean_record = verified_voter_exists(voter)
        if existing_clean_record:
            update_user_review_decision(
                voter_id,
                "Verified",
                "Your voter record was already accepted earlier and is present in the clean verified dataset."
            )
            delete_voter_only(voter_id)
            return jsonify({"message": "Already accepted in clean verified database. Active voter record removed."}), 200

        update_voter_status(voter_id, "Registered")
        voter["status"] = "Registered"
        save_verified_voter(voter)
        update_user_review_decision(voter_id, "Verified", build_review_message("Verified"))
    except Exception as exc:
        return jsonify({"message": f"Unable to register voter: {str(exc)}"}), 500

    return jsonify({"message": "Voter registered and saved to clean verified database"}), 200


# ----------------------
# DUPLICATES
# ----------------------
@app.route("/api/duplicates")
def duplicates():
    df = load_voters()

    detector = DuplicateDetector()
    result = detector.find_duplicates(df)

    return jsonify(result)


@app.route("/api/duplicates/verify", methods=["POST"])
def verify_duplicate_record():
    data = request.get_json() or {}
    voter_id = data.get("voter_id")
    remove_voter_ids = data.get("remove_voter_ids") or []
    if not voter_id:
        return jsonify({"message": "voter_id is required"}), 400

    try:
        voter = get_voter_by_voter_id(voter_id)
        if not voter:
            return jsonify({"message": f"Selected voter record not found: {voter_id}"}), 404

        save_verified_voter(voter)
        ids_to_remove = []
        for item in [*remove_voter_ids, voter_id]:
            value = str(item)
            if value and value not in ids_to_remove:
                ids_to_remove.append(value)

        for item in ids_to_remove:
            if str(item) == str(voter_id):
                update_user_review_decision(item, "Verified", build_review_message("Verified"))
            else:
                update_user_review_decision(
                    item,
                    "Duplicate Removed",
                    build_review_message("Duplicate Removed", "A clean record from your duplicate cluster was retained.")
                )
            delete_voter_only(item)
    except Exception as exc:
        return jsonify({"message": f"Unable to save verified voter: {str(exc)}"}), 500

    return jsonify({"message": "Selected record saved to clean verified voter database and removed from voter records"}), 200


@app.route("/api/voters/<voter_id>/verify-clean", methods=["POST"])
def verify_clean_voter_record(voter_id):
    try:
        voter = get_voter_by_voter_id(voter_id)
        if not voter:
            return jsonify({"message": f"Selected voter record not found: {voter_id}"}), 404

        save_verified_voter(voter)
    except Exception as exc:
        return jsonify({"message": f"Unable to save verified voter: {str(exc)}"}), 500

    return jsonify({"message": "Voter record saved to clean verified voter database"}), 200


@app.route("/api/voters/<voter_id>/verify-and-remove", methods=["POST"])
def verify_and_remove_voter_record(voter_id):
    try:
        voter = get_voter_by_voter_id(voter_id)
        if not voter:
            return jsonify({"message": f"Selected voter record not found: {voter_id}"}), 404

        save_verified_voter(voter)
        delete_voter_record(voter_id)
    except Exception as exc:
        return jsonify({"message": f"Unable to verify and remove voter: {str(exc)}"}), 500

    return jsonify({"message": "Voter verified, saved to clean database, and removed from address audit log"}), 200


@app.route("/api/voters/<voter_id>", methods=["DELETE"])
def delete_voter(voter_id):
    try:
        deleted = delete_voter_record(voter_id)
        if not deleted:
            return jsonify({"message": "Voter not found"}), 404
    except Exception as exc:
        return jsonify({"message": f"Unable to delete voter: {str(exc)}"}), 500

    return jsonify({"message": "Voter record deleted successfully"}), 200


# ----------------------
# FAKE DETECTION
# ----------------------
@app.route("/api/fake")
def fake():
    df = load_voters()

    df["Reasons"] = df.apply(label_row, axis=1)
    df["Status"] = df["Reasons"].apply(
        lambda x: "Suspicious" if len(x) > 0 else "Normal"
    )
    df["SuggestedAction"] = df["Reasons"].apply(build_suggested_action)

    return jsonify(df.to_dict(orient="records"))


@app.route("/api/fake/verify", methods=["POST"])
def verify_suspicious_record():
    data = request.get_json() or {}
    voter_id = data.get("voter_id")

    if not voter_id:
        return jsonify({"message": "voter_id is required"}), 400

    try:
        voter = get_voter_by_voter_id(voter_id)
        if not voter:
            return jsonify({"message": f"Selected voter record not found: {voter_id}"}), 404

        save_verified_voter(voter)
        update_user_review_decision(voter_id, "Verified", build_review_message("Verified"))
        delete_voter_only(voter_id)
    except Exception as exc:
        return jsonify({"message": f"Unable to save suspicious record: {str(exc)}"}), 500

    return jsonify({"message": "Suspicious record approved, saved to clean verified voter database, and removed from voter records"}), 200


@app.route("/api/fake/reject", methods=["POST"])
def reject_suspicious_record():
    data = request.get_json() or {}
    voter_id = data.get("voter_id")
    reason = data.get("reason") or "Rejected during suspicious record review."

    if not voter_id:
        return jsonify({"message": "voter_id is required"}), 400

    try:
        voter = get_voter_by_voter_id(voter_id)
        if not voter:
            return jsonify({"message": f"Selected voter record not found: {voter_id}"}), 404

        update_user_review_decision(voter_id, "Rejected", build_review_message("Rejected", reason))
        delete_voter_only(voter_id)
    except Exception as exc:
        return jsonify({"message": f"Unable to reject suspicious record: {str(exc)}"}), 500

    return jsonify({"message": "Suspicious record rejected, voter notified, and record removed from active voter data"}), 200


# ----------------------
# ADDRESS ANOMALY
# ----------------------
@app.route("/api/address-anomaly")
def address():
    df = load_voters()
    result = detect_address_anomalies(df)

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
