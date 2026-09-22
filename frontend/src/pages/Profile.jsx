import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProfile,
  getFollowers,
  getFollowing,
  uploadProfilePhoto,
  updateProfile,
} from "../services/userService";
import "../styles/Profile.css";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const loadProfile = async () => {
    try {
      const profileData = await getProfile();
      const user = profileData.user;

      setProfile(user);

      const followersData = await getFollowers(user.id);
      const followingData = await getFollowing(user.id);

      console.log(
        "FOLLOWING USERS:",
        JSON.stringify(followingData.following, null, 2),
      );

      setFollowers(followersData.followers || followersData);
      setFollowing(followingData.following || followingData);

      setFollowers(followersData.followers || followersData);
      setFollowing(followingData.following || followingData);
    } catch (error) {
      console.error("Failed to load profile:", error);

      setFeedback({
        type: "error",
        message: "Unable to load your profile right now.",
      });
    }
  };
  useEffect(() => {
    loadProfile();
  }, []);

  // ==================== PROFILE PHOTO ====================

  const handlePhotoSelection = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!validTypes.includes(file.type)) {
      setFeedback({
        type: "error",
        message: "Please choose a JPG, JPEG, or PNG image.",
      });

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "Image size must be 5MB or less.",
      });

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    setFeedback({
      type: "",
      message: "",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setFeedback({
        type: "error",
        message: "Choose an image first.",
      });

      return;
    }

    try {
      setIsUploading(true);

      setFeedback({
        type: "",
        message: "",
      });

      const formData = new FormData();

      formData.append("profileImage", selectedFile);

      const response = await uploadProfilePhoto(formData);

      setProfile((currentProfile) => ({
        ...currentProfile,
        profileImage: response.user.profileImage,
      }));

      setSelectedFile(null);
      setPreviewUrl("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setFeedback({
        type: "success",
        message: response.message || "Profile photo uploaded successfully.",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message || "Upload failed. Please try again.";

      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ==================== EDIT PROFILE ====================

  const handleEditProfile = () => {
    setEditName(profile.name || "");
    setEditBio(profile.bio || "");
    setIsEditing(true);

    setFeedback({
      type: "",
      message: "",
    });
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      setFeedback({
        type: "error",
        message: "Name is required.",
      });

      return;
    }

    try {
      setIsSaving(true);

      setFeedback({
        type: "",
        message: "",
      });

      const response = await updateProfile({
        name: editName,
        bio: editBio,
      });

      setProfile(response.user);
      setIsEditing(false);

      setFeedback({
        type: "success",
        message: "Profile updated successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== LOADING ====================

  if (!profile) {
    return <p>Loading profile...</p>;
  }

  // ==================== PROFILE IMAGE URL ====================

  const profileImageUrl = previewUrl
    ? previewUrl
    : profile.profileImage
      ? `http://localhost:5000${profile.profileImage}`
      : "";

  return (
    <div className="profile-container">
      {/* ==================== PROFILE CARD ==================== */}

      <div className="profile-card">
        <h1>My Profile 👤</h1>

        {/* ==================== PROFILE PHOTO ==================== */}

        <div className="profile-photo-section">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={profile.name}
              className="profile-photo"
            />
          ) : (
            <div className="profile-photo-placeholder">
              {profile.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handlePhotoSelection}
            className="profile-file-input"
            id="profile-photo-input"
          />

          <label htmlFor="profile-photo-input" className="upload-button">
            Upload Profile Photo
          </label>

          {/* ==================== IMAGE PREVIEW ==================== */}

          {selectedFile && (
            <div className="image-preview-box">
              <img src={previewUrl} alt="Preview" className="image-preview" />

              <button
                type="button"
                className="save-photo-button"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Save Photo"}
              </button>
            </div>
          )}

          {/* ==================== FEEDBACK ==================== */}

          {feedback.message && (
            <p className={`profile-feedback ${feedback.type}`}>
              {feedback.message}
            </p>
          )}
        </div>

        {/* ==================== PROFILE DETAILS ==================== */}

        {isEditing ? (
          <div className="edit-profile-section">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter your name"
            />

            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell something about yourself..."
              rows="3"
            />

            <div className="edit-profile-actions">
              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "💾 Save Changes"}
              </button>

              <button type="button" onClick={() => setIsEditing(false)}>
                ❌ Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>{profile.name}</h2>

            {profile.bio && <p>{profile.bio}</p>}

            <p>{profile.email}</p>
          </>
        )}

        {/* ==================== FOLLOW STATS ==================== */}

        <div className="profile-stats">
          <div
            className="profile-stat-clickable"
            onClick={() => {
              setShowFollowers(!showFollowers);
              setShowFollowing(false);
            }}
          >
            <strong>{followers.length}</strong>
            <span>Followers</span>
          </div>

          <div
            className="profile-stat-clickable"
            onClick={() => {
              setShowFollowing(!showFollowing);
              setShowFollowers(false);
            }}
          >
            <strong>{following.length}</strong>
            <span>Following</span>
          </div>
        </div>
        {showFollowers && (
          <div className="profile-user-list">
            <h3>👥 Followers</h3>

            {followers.length === 0 ? (
              <p className="empty-user-list">No followers yet.</p>
            ) : (
              followers.map((user) => (
                <div className="profile-user-item" key={user.id}>
                  {user.profileImage ? (
                    <img
                      src={`http://localhost:5000${user.profileImage}`}
                      alt={user.name}
                      className="profile-user-avatar"
                    />
                  ) : (
                    <div className="profile-user-avatar-placeholder">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div className="profile-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showFollowing && (
          <div className="profile-user-list">
            <h3>👤 Following</h3>

            {following.length === 0 ? (
              <p className="empty-user-list">
                You are not following anyone yet.
              </p>
            ) : (
              following.map((user) => (
                <div className="profile-user-item" key={user.id}>
                  {user.profileImage ? (
                    <img
                      src={`http://localhost:5000${user.profileImage}`}
                      alt={user.name}
                      className="profile-user-avatar"
                    />
                  ) : (
                    <div className="profile-user-avatar-placeholder">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div className="profile-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== EDIT PROFILE BUTTON ==================== */}

        {!isEditing && (
          <button
            type="button"
            className="edit-profile-button"
            onClick={handleEditProfile}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* ==================== FLOATING HELP & SUPPORT ==================== */}

      <Link to="/support" className="floating-support-button">
        💭 Help & Support
      </Link>
    </div>
  );
}

export default Profile;
