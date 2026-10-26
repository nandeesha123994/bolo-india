import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { API_ORIGIN } from "../api";
import { getOrCreateConversation } from "../services/chatService";
import {
  followUser,
  getPublicProfile,
  unfollowUser,
} from "../services/userService";
import "../styles/Profile.css";

const getMediaUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followPending, setFollowPending] = useState(false);
  const [chatPending, setChatPending] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getPublicProfile(userId);
        if (active) {
          setProfile(data.user);
          setPosts(data.posts);
        }
      } catch (requestError) {
        console.error("Failed to load user profile:", requestError);
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load this profile right now.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  if (String(loggedInUser?.id) === String(userId)) {
    return <Navigate to="/profile" replace />;
  }

  const handleFollowToggle = async () => {
    if (!profile || followPending) return;

    try {
      setFollowPending(true);
      setError("");
      if (profile.isFollowing) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      const updatedData = await getPublicProfile(profile.id);
      setProfile(updatedData.user);
      setPosts(updatedData.posts);
    } catch (requestError) {
      console.error("Failed to update follow status:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Unable to update follow status. Please try again.",
      );
    } finally {
      setFollowPending(false);
    }
  };

  const handleStartChat = async () => {
    if (!profile || chatPending) return;

    try {
      setChatPending(true);
      setError("");
      const conversation = await getOrCreateConversation(profile.id);
      navigate("/chat", { state: { conversationId: conversation.id } });
    } catch (requestError) {
      console.error("Failed to start chat:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Unable to start a conversation right now.",
      );
    } finally {
      setChatPending(false);
    }
  };

  if (loading) return <p className="posts-message">Loading profile...</p>;
  if (error && !profile) {
    return <p className="posts-message posts-error">{error}</p>;
  }
  if (!profile) {
    return <p className="posts-message posts-error">User not found.</p>;
  }

  const profileImageUrl = getMediaUrl(profile.profileImage);

  return (
    <div className="profile-container">
      <div className="profile-card public-profile-card">
        <h1>Profile</h1>
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
        </div>
        <h2>{profile.name}</h2>
        {profile.bio && <p>{profile.bio}</p>}

        <div className="profile-stats">
          <div>
            <strong>{profile.followersCount}</strong>
            <span>Followers</span>
          </div>
          <div>
            <strong>{profile.followingCount}</strong>
            <span>Following</span>
          </div>
        </div>

        <button
          type="button"
          className={
            profile.isFollowing
              ? "public-unfollow-button"
              : "public-follow-button"
          }
          onClick={handleFollowToggle}
          disabled={followPending}
        >
          {followPending
            ? "Please wait..."
            : profile.isFollowing
              ? "Unfollow"
              : "Follow"}
        </button>
        <button
              type="button"
              className="public-chat-button"
              onClick={handleStartChat}
              disabled={chatPending}
        >
              {chatPending ? "Opening chat..." : "Chat"}
        </button>
        {error && <p className="profile-feedback error">{error}</p>}
      </div>

      <section className="my-posts-section">
        <div className="my-posts-heading">
          <h2>Posts</h2>
          <span>{posts.length} posts</span>
        </div>
        {posts.length === 0 ? (
          <p className="posts-message">No public posts yet.</p>
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
                      alt={post.content || "Post"}
                      loading="lazy"
                    />
                  ) : videoUrl ? (
                    <video
                      className="my-post-media"
                      src={videoUrl}
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="my-post-text-tile">
                      <p>{post.content || "Post"}</p>
                    </div>
                  )}
                  <div className="my-post-overlay">
                    <p>{post.content || "View post"}</p>
                    <span>
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default PublicProfile;
