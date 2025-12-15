<div class="row">
  <div class="col-lg-10 mx-auto">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6"><i class="fa-solid fa-clock-rotate-left"></i> Reading History</h1>
        <p class="lead text-muted">Your recently viewed threads (max 60)</p>
      </div>
      <div>
        <span class="badge bg-success fs-6" id="history-count">0 threads</span>
        <button class="btn btn-outline-danger btn-sm ms-2" id="clear-history-btn">
          <i class="fa-solid fa-trash"></i> Clear All
        </button>
      </div>
    </div>

    <!-- History List -->
    <div id="thread-history-list"></div>

    <!-- Empty State -->
    <div id="empty-history-state" style="display: none;" class="text-center py-5">
      <i class="fa-solid fa-clock-rotate-left display-1 text-muted"></i>
      <h3 class="mt-3">No Reading History</h3>
      <p class="text-muted">Start browsing threads to build your reading history!</p>
      <a href="/" class="btn btn-success btn-lg mt-3">
        <i class="fa-solid fa-house"></i> Go Home
      </a>
    </div>
  </div>
</div>
