import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProfile,
  getFollowers,
  getFollowing,
  uploadProfilePhoto,
  updateProfile,
} from "../services/userService";
import { getPosts } from "../services/postService";
import "../styles/Profile.css";

const API_BASE_URL = "http://localhost:5000";

function getUserId(post) {
  return (
    post.userId ??
    post.authorId ??
    post.user?.id ??
    post.author?.id ??
    post.createdBy?.id
  );
}

function getMediaUrl(path) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function Profile() {
  const [profile, setProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");

  // Selected photo or video for the popup
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [followersPagination, setFollowersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [followingPagination, setFollowingPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 5,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const loadPosts = async (userId) => {
    try {
      setPostsLoading(true);
      setPostsError("");

      const allPosts = await getPosts();

      const ownPosts = (Array.isArray(allPosts) ? allPosts : []).filter(
        (post) => String(getUserId(post)) === String(userId),
      );

      setPosts(ownPosts);
    } catch (error) {
      console.error("Failed to load profile posts:", error);
      setPostsError("Unable to load your posts right now.");
    } finally {
      setPostsLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const profileData = await getProfile();
      const user = profileData.user;

      setProfile(user);

      const [followersResult, followingResult] = await Promise.all([
        getFollowers(user.id, 1, 5),
        getFollowing(user.id, 1, 5),
      ]);

      setFollowers(
        (followersResult.followers || []).map(
          (follow) => follow.follower || follow,
        ),
      );

      setFollowing(followingResult.following || followingResult || []);

      setFollowersPagination(followersResult.pagination);
      setFollowingPagination(followingResult.pagination);

      await loadPosts(user.id);
    } catch (error) {
      console.error("Failed to load profile:", error);

      setFeedback({
        type: "error",
        message: "Unable to load your profile right now.",
      });

      setPostsLoading(false);
    }
  };

  const loadFollowersPage = async (page) => {
    try {
      const data = await getFollowers(profile.id, page, 5);

      setFollowers(
        (data.followers || []).map((follow) => follow.follower || follow),
      );

      setFollowersPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load followers:", error);
    }
  };

  const loadFollowingPage = async (page) => {
    try {
      const data = await getFollowing(profile.id, page, 5);

      setFollowing(data.following || []);
      setFollowingPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load following:", error);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Close popup using Escape
  useEffect(() => {
    if (!selectedMedia) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedMedia(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedMedia]);

  // PROFILE PHOTO UPLOAD

  const handlePhotoSelection = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

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
    setFeedback({ type: "", message: "" });
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
      setFeedback({ type: "", message: "" });

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
      setFeedback({
        type: "error",
        message:
          error?.response?.data?.message || "Upload failed. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // EDIT PROFILE

  const handleEditProfile = () => {
    setEditName(profile.name || "");
    setEditBio(profile.bio || "");
    setIsEditing(true);
    setFeedback({ type: "", message: "" });
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
      setFeedback({ type: "", message: "" });

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

  if (!profile) {
    return <p>Loading profile...</p>;
  }

  const profileImageUrl = previewUrl
    ? previewUrl
    : profile.profileImage
      ? getMediaUrl(profile.profileImage)
      : "";

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>My Profile 👤</h1>

        {/* PROFILE PHOTO */}

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

          {selectedFile && (
            <div className="image-preview-box">
              <img
                src={previewUrl}
                alt="Profile preview"
                className="image-preview"
              />

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

          {feedback.message && (
            <p className={`profile-feedback ${feedback.type}`}>
              {feedback.message}
            </p>
          )}
        </div>

        {/* PROFILE DETAILS */}

        {isEditing ? (
          <div className="edit-profile-section">
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Enter your name"
            />

            <textarea
              value={editBio}
              onChange={(event) => setEditBio(event.target.value)}
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

        {/* FOLLOW STATS */}

        <div className="profile-stats">
          <div
            className="profile-stat-clickable"
            onClick={() => {
              setShowFollowers(!showFollowers);
              setShowFollowing(false);
            }}
          >
            <strong>{followersPagination.totalUsers}</strong>
            <span>Followers</span>
          </div>

          <div
            className="profile-stat-clickable"
            onClick={() => {
              setShowFollowing(!showFollowing);
              setShowFollowers(false);
            }}
          >
            <strong>{followingPagination.totalUsers}</strong>
            <span>Following</span>
          </div>
        </div>

        {/* FOLLOWERS LIST */}

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
                      src={getMediaUrl(user.profileImage)}
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

            {followersPagination.totalPages > 1 && (
              <div className="profile-pagination">
                <button
                  onClick={() =>
                    loadFollowersPage(followersPagination.currentPage - 1)
                  }
                  disabled={!followersPagination.hasPreviousPage}
                >
                  ← Previous
                </button>

                <span>
                  Page {followersPagination.currentPage} of{" "}
                  {followersPagination.totalPages}
                </span>

                <button
                  onClick={() =>
                    loadFollowersPage(followersPagination.currentPage + 1)
                  }
                  disabled={!followersPagination.hasNextPage}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* FOLLOWING LIST */}

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
                      src={getMediaUrl(user.profileImage)}
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

            {followingPagination.totalPages > 1 && (
              <div className="profile-pagination">
                <button
                  onClick={() =>
                    loadFollowingPage(followingPagination.currentPage - 1)
                  }
                  disabled={!followingPagination.hasPreviousPage}
                >
                  ← Previous
                </button>

                <span>
                  Page {followingPagination.currentPage} of{" "}
                  {followingPagination.totalPages}
                </span>

                <button
                  onClick={() =>
                    loadFollowingPage(followingPagination.currentPage + 1)
                  }
                  disabled={!followingPagination.hasNextPage}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* MY POSTS GRID */}

      <section className="my-posts-section">
        <div className="my-posts-heading">
          <h2>My Posts</h2>
          <span>{posts.length} posts</span>
        </div>

        {postsLoading ? (
          <p className="posts-message">Loading your posts...</p>
        ) : postsError ? (
          <p className="posts-message posts-error">{postsError}</p>
        ) : posts.length === 0 ? (
          <div className="posts-empty-state">
            <div className="posts-empty-icon">▦</div>
            <h3>No posts yet</h3>
            <p>Share your first moment with India!</p>
            <Link to="/home">Create a Post</Link>
          </div>
        ) : (
          <div className="my-posts-grid">
            {posts.map((post) => {
              const imageUrl = getMediaUrl(post.image);
              const videoUrl = getMediaUrl(post.video);

              return (
                <article className="my-post-tile" key={post.id}>
                  {imageUrl ? (
                    <img
                      className="my-post-media"
                      src={imageUrl}
                      alt={post.content || "My post"}
                      loading="lazy"
                      onClick={() =>
                        setSelectedMedia({
                          type: "image",
                          url: imageUrl,
                        })
                      }
                    />
                  ) : videoUrl ? (
                    <video
                      className="my-post-media"
                      src={videoUrl}
                      preload="metadata"
                      muted
                      playsInline
                      onClick={() =>
                        setSelectedMedia({
                          type: "video",
                          url: videoUrl,
                        })
                      }
                    />
                  ) : (
                    <div className="my-post-text-tile">
                      <p>{post.content || "Post"}</p>
                    </div>
                  )}

                  <div className="my-post-overlay">
                    <p>{post.content || "View post"}</p>
                    <span>
                      ❤️ {post.likes?.length ?? post._count?.likes ?? 0}
                      {"  "}💬{" "}
                      {post.comments?.length ?? post._count?.comments ?? 0}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FULL-SIZE PHOTO / VIDEO POPUP */}

      {selectedMedia && (
        <div className="video-modal" onClick={() => setSelectedMedia(null)}>
          <button
            type="button"
            className="video-modal-close"
            onClick={() => setSelectedMedia(null)}
            aria-label="Close media"
          >
            ✕
          </button>

          {selectedMedia.type === "video" ? (
            <video
              key={selectedMedia.url}
              className="video-modal-player"
              src={selectedMedia.url}
              controls
              autoPlay
              playsInline
              onClick={(event) => event.stopPropagation()}
              onError={() =>
                console.error("Video failed to load:", selectedMedia.url)
              }
            />
          ) : (
            <img
              className="video-modal-player"
              src={selectedMedia.url}
              alt="Full-size post"
              onClick={(event) => event.stopPropagation()}
              onError={() =>
                console.error("Image failed to load:", selectedMedia.url)
              }
            />
          )}
        </div>
      )}

      <Link to="/support" className="floating-support-button">
        💭 Help &amp; Support
      </Link>
    </div>
  );
}

export default Profile;
