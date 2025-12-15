<div class="row">
  <div class="col-lg-10 mx-auto">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6"><i class="fa-solid fa-bookmark text-warning"></i> Bookmarked Threads</h1>
        <p class="lead text-muted">Your saved threads for later reading</p>
      </div>
      <div>
        <span class="badge bg-warning text-dark fs-6" id="bookmarks-count">0 threads</span>
        <button class="btn btn-outline-danger btn-sm ms-2" id="clear-bookmarks-btn">
          <i class="fa-solid fa-trash"></i> Clear All
        </button>
      </div>
    </div>

    <!-- Bookmarks List -->
    <div id="thread-bookmarks-list"></div>

    <!-- Empty State -->
    <div id="empty-bookmarks-state" style="display: none;" class="text-center py-5">
      <i class="fa-regular fa-bookmark display-1 text-muted"></i>
      <h3 class="mt-3">No Bookmarked Threads</h3>
      <p class="text-muted">Start bookmarking threads to save them for later!</p>
      <a href="/" class="btn btn-success btn-lg mt-3">
        <i class="fa-solid fa-house"></i> Go Home
      </a>
    </div>
  </div>
</div>
