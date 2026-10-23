import { useEffect, useRef, useState } from "react";
import {
  createPost,
  getPosts,
  likePost,
  addComment,
  getComments,
  createReport,
  deletePost,
} from "../services/postService";
import { API_ORIGIN } from "../api";
import { useFeedback } from "../components/FeedbackProvider";
import "../styles/Home.css";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "U";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
};

const ProfileAvatar = ({ name, image, className }) => {
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${API_ORIGIN}${image}`
    : "";

  return (
    <div className={`${className} profile-avatar`}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.nextElementSibling.hidden = false;
          }}
        />
      )}
      <span hidden={Boolean(imageUrl)}>{getInitials(name)}</span>
    </div>
  );
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return "Just now";

  const diffInMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateString).getTime()) / 60000),
  );

  if (diffInMinutes < 1) return "Just now";

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
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const { showToast, confirmAction } = useFeedback();

  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create post fields
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  // File input references
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Generate image preview and clean it up when changed
  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [image]);

  // Generate video preview and clean it up when changed
  useEffect(() => {
    if (!video) {
      setVideoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(video);
    setVideoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [video]);

  // Comments
  const [commentText, setCommentText] = useState({});
  const [comments, setComments] = useState({});

  // Reports
  const [reportReason, setReportReason] = useState({});
  const [showReportForm, setShowReportForm] = useState({});

  // Load posts and comments
  const loadPosts = async () => {
    try {
      setLoading(true);

      const data = await getPosts();
      setPosts(data);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Select image
  const handleImageChange = (e) => {
    const selectedImage = e.target.files?.[0] || null;

    if (!selectedImage) return;

    if (!selectedImage.type.startsWith("image/")) {
      showToast("Please choose a valid image.", "error");
      e.target.value = "";
      return;
    }

    // Only one media file can be selected
    setVideo(null);

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }

    setImage(selectedImage);
  };

  // Select video
  const handleVideoChange = (e) => {
    const selectedVideo = e.target.files?.[0] || null;

    if (!selectedVideo) return;

    if (!SUPPORTED_VIDEO_TYPES.includes(selectedVideo.type)) {
      showToast("Please choose an MP4, WebM, or MOV video.", "error");
      e.target.value = "";
      setVideo(null);
      return;
    }

    if (selectedVideo.size > MAX_VIDEO_SIZE) {
      showToast("Video must be 50 MB or smaller.", "error");
      e.target.value = "";
      setVideo(null);
      return;
    }

    // Only one media file can be selected
    setImage(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    setVideo(selectedVideo);
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImage(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Remove selected video
  const handleRemoveVideo = () => {
    setVideo(null);

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  // Create post
  const handleCreatePost = async () => {
    if (!content.trim()) {
      showToast("Please write something.", "error");
      return;
    }

    if (image && video) {
      showToast("Please add either an image or a video, not both.", "error");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("content", content.trim());

      if (image) formData.append("image", image);
      if (video) formData.append("video", video);
      const finalCategory =
        category === "Other" ? customCategory.trim() : category;

      if (finalCategory) {
        formData.append("category", finalCategory);
      }
      if (hashtags.trim()) formData.append("hashtags", hashtags.trim());
      if (location.trim()) formData.append("location", location.trim());

      formData.append("visibility", visibility);
      formData.append("commentsEnabled", commentsEnabled);

      await createPost(formData);

      showToast("Post created successfully.");

      // Reset form and selected files
      setContent("");
      setImage(null);
      setVideo(null);
      setCategory("");
      setCustomCategory("");
      setHashtags("");
      setLocation("");
      setVisibility("PUBLIC");
      setCommentsEnabled(true);

      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";

      setShowForm(false);
      loadPosts();
    } catch (error) {
      console.error("Failed to create post:", error);
      showToast(
        error.response?.data?.message || "Failed to create post.",
        "error",
      );
    }
  };

  // Like post
  const handleLike = async (postId) => {
    const post = posts.find((item) => item.id === postId);
    const wasLiked = post?.likes?.some(
      (like) => Number(like.userId) === Number(loggedInUser?.id),
    );

    try {
      await likePost(postId);
      showToast(wasLiked ? "Like removed." : "Post liked.");
      loadPosts();
    } catch (error) {
      console.error("Failed to toggle post like:", error);
      showToast(error.response?.data?.message || "Failed to update like.", "error");
    }
  };

  // Delete own post
  const handleDeletePost = async (postId) => {
    const confirmDelete = await confirmAction(
      "Are you sure you want to delete this post?",
    );

    if (!confirmDelete) return;

    try {
      await deletePost(postId);
      showToast("Post deleted successfully.");
      loadPosts();
    } catch (error) {
      console.error("Failed to delete post:", error);
      showToast(
        error.response?.data?.message || "Failed to delete post.",
        "error",
      );
    }
  };

  // Add comment
  const handleComment = async (postId) => {
    const text = commentText[postId];

    if (!text || !text.trim()) {
      showToast("Please write a comment.", "error");
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
      showToast(
        error.response?.data?.message || "Failed to add comment.",
        "error",
      );
    }
  };

  // Report post
  const handleReport = async (postId) => {
    const reason = reportReason[postId];

    if (!reason || !reason.trim()) {
      showToast("Please enter a reason for reporting.", "error");
      return;
    }

    try {
      await createReport(postId, reason);

      showToast("Report submitted successfully.");

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
      showToast(
        error.response?.data?.message || "Failed to submit report.",
        "error",
      );
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
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {/* Image Upload and Preview */}
            <div className="post-field">
              <label>📷 Upload Image (optional)</label>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              {image && (
                <div className="media-preview">
                  <div className="media-preview-header">
                    {/* <span>Image preview</span> */}

                    <button
                      type="button"
                      className="remove-media-button"
                      onClick={handleRemoveImage}
                    >
                      ✕ Remove image
                    </button>
                  </div>

                  <img
                    src={imagePreview}
                    alt="Selected image preview"
                    className="upload-image-preview"
                  />

                  <p className="selected-file">{image.name}</p>
                </div>
              )}
            </div>
            {/* Video Upload and Preview */}
            <div className="post-field">
              <label>🎥 Upload Video (optional)</label>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoChange}
              />

              {video && (
                <div className="media-preview">
                  <div className="media-preview-header">
                    {/* <span>Video preview</span> */}

                    <button
                      type="button"
                      className="remove-media-button"
                      onClick={handleRemoveVideo}
                    >
                      ✕ Remove video
                    </button>
                  </div>

                  <video
                    src={videoPreview}
                    controls
                    playsInline
                    className="upload-video-preview"
                  />

                  <p className="selected-file">{video.name}</p>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="post-field">
              <label>🏷️ Category (optional)</label>

              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value !== "Other") {
                    setCustomCategory("");
                  }
                }}
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

              {category === "Other" && (
                <input
                  type="text"
                  placeholder="Enter your custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  maxLength={50}
                />
              )}
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
            <button onClick={handleCreatePost}>🚀 Create Post</button>
          </div>
        )}

        {/* Posts */}
        {(loading || posts.length > 0) && (
          <div className="posts-container">
            <h2>Recent Posts</h2>

            {loading ? (
              <div className="skeleton-posts">
                {[1, 2, 3].map((item) => (
                  <div className="skeleton-post-card" key={item}>
                    <div className="skeleton-post-header">
                      <div className="skeleton skeleton-avatar"></div>

                      <div className="skeleton-author-info">
                        <div className="skeleton skeleton-name"></div>
                        <div className="skeleton skeleton-time"></div>
                      </div>
                    </div>

                    <div className="skeleton skeleton-content"></div>
                    <div className="skeleton skeleton-content short"></div>
                    <div className="skeleton skeleton-image"></div>

                    <div className="skeleton-actions">
                      <div className="skeleton skeleton-button"></div>
                      <div className="skeleton skeleton-button"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              posts.map((post) => {
                const author = post.author || {};
                const authorName = author.name || "Unknown User";

                const authorPhoto =
                  author.profilePhoto || author.profileImage || "";

                const authorAvatarUrl = authorPhoto
                  ? authorPhoto.startsWith("http")
                    ? authorPhoto
                    : `${API_ORIGIN}${authorPhoto}`
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

                    <p className="post-content">{post.content}</p>

                    {post.category && (
                      <p className="post-category">🏷️ {post.category}</p>
                    )}

                    {post.hashtags && (
                      <p className="post-hashtags">{post.hashtags}</p>
                    )}

                    {post.location && (
                      <p className="post-location">📍 {post.location}</p>
                    )}

                    <p className="post-visibility">
                      👁️{" "}
                      {post.visibility === "FOLLOWERS" ? "Followers" : "Public"}
                    </p>

                    {/* Post Image */}
                    {post.image && (
                      <img
                        src={`${API_ORIGIN}${post.image}`}
                        alt="Post"
                        className="post-image"
                      />
                    )}

                    {/* Post Video */}
                    {post.video && (
                      <video
                        src={
                          post.video.startsWith("http")
                            ? post.video
                            : `${API_ORIGIN}${post.video}`
                        }
                        controls
                        className="post-video"
                      />
                    )}

                    <button
                      onClick={() => handleLike(post.id)}
                      aria-pressed={post.likes?.some(
                        (like) =>
                          Number(like.userId) === Number(loggedInUser?.id),
                      )}
                    >
                      {post.likes?.some(
                        (like) =>
                          Number(like.userId) === Number(loggedInUser?.id),
                      )
                        ? "❤️"
                        : "🤍"}{" "}
                      {post.likes?.length || 0}
                    </button>

                    {loggedInUser?.id === post.authorId && (
                      <button
                        className="delete-post-button"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        🗑️ Delete
                      </button>
                    )}

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
                        comments[post.id].map((comment) => {
                          const commenter = comment.user || {};
                          const commenterName = commenter.name || "Unknown User";

                          return (
                            <div className="comment" key={comment.id}>
                              <ProfileAvatar
                                name={commenterName}
                                image={commenter.profileImage}
                                className="comment-avatar"
                              />
                              <div className="comment-body">
                                <div className="comment-meta">
                                  <span className="comment-author">
                                    {commenterName}
                                  </span>
                                  <span className="comment-time">
                                    {formatRelativeTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="comment-content">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                      {post.commentsEnabled ? (
                        <div className="comment-compose">
                          <ProfileAvatar
                            name={loggedInUser?.name || "You"}
                            image={
                              loggedInUser?.profileImage ||
                              loggedInUser?.profilePhoto
                            }
                            className="comment-avatar"
                          />
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
                        </div>
                      ) : (
                        <p className="comments-disabled">
                          💬 Comments are disabled for this post.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="no-posts">
            <p>No posts yet. Be the first to create one! 🇮🇳</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
