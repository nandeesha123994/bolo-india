import { useEffect, useState } from "react";
import {
  createPost,
  getPosts,
  likePost,
  addComment,
  getComments,
  createReport,
  deletePost,
} from "../services/postService";
import "../styles/Home.css";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
};

const formatRelativeTime = (dateString) => {
  if (!dateString) {
    return "Just now";
  }

  const diffInMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateString).getTime()) / 60000),
  );

  if (diffInMinutes < 1) {
    return "Just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  }

  return new Date(dateString).toLocaleDateString();
};

function Home() {
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState([]);

  // Create post fields
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [category, setCategory] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  // Comments
  const [commentText, setCommentText] = useState({});
  const [comments, setComments] = useState({});

  // Reports
  const [reportReason, setReportReason] = useState({});
  const [showReportForm, setShowReportForm] = useState({});

  // Load posts and comments
  const loadPosts = async () => {
    try {
      const data = await getPosts();

      setPosts(data);

      // Load comments for each post
      for (const post of data) {
        try {
          const commentData = await getComments(post.id);

          setComments((prev) => ({
            ...prev,
            [post.id]: commentData.comments || commentData,
          }));
        } catch (error) {
          console.error("Failed to load comments:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load posts:", error);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Create post
  const handleCreatePost = async () => {
    if (!content.trim()) {
      alert("Please write something");
      return;
    }

    // Image and video cannot be added together
    if (image && video) {
      alert("Please add either an image or a video, not both");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("content", content.trim());

      if (image) {
        formData.append("image", image);
      }

      if (video) {
        formData.append("video", video);
      }

      if (category) {
        formData.append("category", category);
      }

      if (hashtags.trim()) {
        formData.append("hashtags", hashtags.trim());
      }

      if (location.trim()) {
        formData.append("location", location.trim());
      }

      formData.append("visibility", visibility);
      formData.append("commentsEnabled", commentsEnabled);

      await createPost(formData);

      alert("Post created successfully!");

      // Reset form
      setContent("");
      setImage(null);
      setVideo(null);
      setCategory("");
      setHashtags("");
      setLocation("");
      setVisibility("PUBLIC");
      setCommentsEnabled(true);
      setShowForm(false);

      loadPosts();
    } catch (error) {
      console.error("Failed to create post:", error);

      alert(error.response?.data?.message || "Failed to create post");
    }
  };

  // Like post
  const handleLike = async (postId) => {
    try {
      await likePost(postId);
      loadPosts();
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };
  // Delete own post
  const handleDeletePost = async (postId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deletePost(postId);

      alert("Post deleted successfully!");

      loadPosts();
    } catch (error) {
      console.error("Failed to delete post:", error);

      alert(error.response?.data?.message || "Failed to delete post");
    }
  };

  // Add comment
  const handleComment = async (postId) => {
    const text = commentText[postId];

    if (!text || !text.trim()) {
      alert("Please write a comment");
      return;
    }

    try {
      await addComment(postId, text);

      setCommentText((prev) => ({
        ...prev,
        [postId]: "",
      }));

      loadPosts();
    } catch (error) {
      console.error("Failed to add comment:", error);

      alert(error.response?.data?.message || "Failed to add comment");
    }
  };

  // Report post
  const handleReport = async (postId) => {
    const reason = reportReason[postId];

    if (!reason || !reason.trim()) {
      alert("Please enter a reason for reporting");
      return;
    }

    try {
      await createReport(postId, reason);

      alert("Report submitted successfully!");

      setReportReason((prev) => ({
        ...prev,
        [postId]: "",
      }));

      setShowReportForm((prev) => ({
        ...prev,
        [postId]: false,
      }));
    } catch (error) {
      console.error("Failed to report post:", error);

      alert(error.response?.data?.message || "Failed to submit report");
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>Welcome to Bolo India 🇮🇳</h1>

        <p>Share your thoughts, ideas and moments with India.</p>

        {/* Create Post Button */}
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "Create Post"}
        </button>

        {/* Create Post Form */}
        {showForm && (
          <div className="post-form">
            {/* Content */}
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {/* Image Upload */}
            <div className="post-field">
              <label>📷 Upload Image (optional)</label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0] || null)}
              />

              {image && <p className="selected-file">Selected: {image.name}</p>}
            </div>

            {/* Video */}
            <div className="post-field">
              <label>🎥 Upload Video (optional)</label>

              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const selectedVideo = e.target.files[0] || null;

                  if (!selectedVideo) {
                    setVideo(null);
                    return;
                  }

                  if (!SUPPORTED_VIDEO_TYPES.includes(selectedVideo.type)) {
                    alert("Please choose an MP4, WebM, or MOV video");
                    e.target.value = "";
                    setVideo(null);
                    return;
                  }

                  if (selectedVideo.size > MAX_VIDEO_SIZE) {
                    alert("Video must be 50 MB or smaller");
                    e.target.value = "";
                    setVideo(null);
                    return;
                  }

                  setVideo(selectedVideo);
                }}
              />

              {video && <p className="selected-file">Selected: {video.name}</p>}
            </div>

            {/* Category */}
            <div className="post-field">
              <label>🏷️ Category (optional)</label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category</option>
                <option value="News">News</option>
                <option value="Education">Education</option>
                <option value="Sports">Sports</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Technology">Technology</option>
                <option value="Government">Government</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Hashtags */}
            <div className="post-field">
              <label>#️⃣ Hashtags (optional)</label>

              <input
                type="text"
                placeholder="#India #BoloIndia"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="post-field">
              <label>📍 Location (optional)</label>

              <input
                type="text"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Visibility */}
            <div className="post-field">
              <label>👁️ Who can see this?</label>

              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="PUBLIC">Public</option>
                <option value="FOLLOWERS">Followers</option>
              </select>
            </div>

            {/* Comments */}
            <div className="comments-setting">
              <label>💬 Allow comments</label>

              <input
                type="checkbox"
                checked={commentsEnabled}
                onChange={(e) => setCommentsEnabled(e.target.checked)}
              />
            </div>

            {/* Create Post */}
            <button onClick={handleCreatePost}>🚀 Create Post</button>
          </div>
        )}

        {/* Posts */}
        {posts.length > 0 && (
          <div className="posts-container">
            <h2>Recent Posts</h2>

            {posts.map((post) => {
              const author = post.author || {};
              const authorName = author.name || "Unknown User";
              const authorPhoto =
                author.profilePhoto || author.profileImage || "";
              const authorAvatarUrl = authorPhoto
                ? authorPhoto.startsWith("http")
                  ? authorPhoto
                  : `http://localhost:5000${authorPhoto}`
                : "";

              return (
                <div className="post-card" key={post.id}>
                  <div className="post-header">
                    <div className="post-author-block">
                      {authorAvatarUrl ? (
                        <img
                          src={authorAvatarUrl}
                          alt={authorName}
                          className="post-avatar"
                        />
                      ) : (
                        <div className="post-avatar-placeholder">
                          {getInitials(authorName)}
                        </div>
                      )}

                      <div className="post-author-meta">
                        <span className="post-author-name">{authorName}</span>
                        <span className="post-time">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="post-content">{post.content}</p>

                  {/* Category */}
                  {post.category && (
                    <p className="post-category">🏷️ {post.category}</p>
                  )}

                  {/* Hashtags */}
                  {post.hashtags && (
                    <p className="post-hashtags">{post.hashtags}</p>
                  )}

                  {/* Location */}
                  {post.location && (
                    <p className="post-location">📍 {post.location}</p>
                  )}

                  {/* Visibility */}
                  <p className="post-visibility">
                    👁️{" "}
                    {post.visibility === "FOLLOWERS" ? "Followers" : "Public"}
                  </p>

                  {/* Image */}
                  {post.image && (
                    <img
                      src={`http://localhost:5000${post.image}`}
                      alt="Post"
                      className="post-image"
                    />
                  )}

                  {/* Video */}
                  {post.video && (
                    <video
                      src={
                        post.video.startsWith("http")
                          ? post.video
                          : `http://localhost:5000${post.video}`
                      }
                      controls
                      className="post-video"
                    />
                  )}

                  {/* Like */}
                  <button onClick={() => handleLike(post.id)}>
                    ❤️ {post.likes?.length || 0}
                  </button>

                  {loggedInUser?.id === post.authorId && (
                    <button
                      className="delete-post-button"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      🗑️ Delete
                    </button>
                  )}

                  {/* Report */}
                  <button
                    onClick={() =>
                      setShowReportForm((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                  >
                    🚩 Report
                  </button>

                  {/* Report Form */}
                  {showReportForm[post.id] && (
                    <div className="report-form">
                      <textarea
                        placeholder="Why are you reporting this post?"
                        value={reportReason[post.id] || ""}
                        onChange={(e) =>
                          setReportReason((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                      />

                      <button onClick={() => handleReport(post.id)}>
                        Submit Report
                      </button>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="comments-section">
                    <h3>Comments 💬</h3>

                    {comments[post.id]?.length > 0 &&
                      comments[post.id].map((comment) => (
                        <div className="comment" key={comment.id}>
                          {comment.content}
                        </div>
                      ))}

                    {/* Comment input */}
                    {post.commentsEnabled ? (
                      <div className="comment-form">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText[post.id] || ""}
                          onChange={(e) =>
                            setCommentText((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                        />

                        <button onClick={() => handleComment(post.id)}>
                          Comment
                        </button>
                      </div>
                    ) : (
                      <p className="comments-disabled">
                        💬 Comments are disabled for this post.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No posts */}
        {posts.length === 0 && (
          <div className="no-posts">
            <p>No posts yet. Be the first to create one! 🇮🇳</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
