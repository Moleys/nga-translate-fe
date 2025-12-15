<script>
  export let fid = "";
</script>

<div class="row">
  <div class="col-lg-10 mx-auto">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6" id="forum-name">Loading...</h1>
        <p class="text-muted mb-0">Forum ID: {fid}</p>
      </div>
      <a href="/" class="btn btn-outline-secondary">
        <i class="fa-solid fa-arrow-left"></i> Back to Forums
      </a>
    </div>

    <!-- Subforum list -->
    <div id="subforum-container" class="mb-4" style="display: none;">
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0"><i class="fa-solid fa-folder"></i> Subforums</h6>
        </div>
        <div class="card-body">
          <div id="subforum-list" class="d-flex flex-wrap gap-2"></div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="btn-group" role="group" aria-label="Filter threads">
          <button type="button" class="btn btn-outline-success filter-btn active" data-act="list">
            <i class="fa-solid fa-list-ul"></i> Latest
          </button>
          <button type="button" class="btn btn-outline-success filter-btn" data-act="topped">
            <i class="fa-solid fa-thumbtack"></i> Topped
          </button>
          <button type="button" class="btn btn-outline-success filter-btn" data-act="hot">
            <i class="fa-solid fa-fire"></i> Hot
          </button>
        </div>
      </div>
    </div>

    <div id="forum-threads" data-fid={fid}>
      <div id="threads-list">
        <div class="text-center py-5">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading threads...</p>
        </div>
      </div>

      <div id="scroll-sentinel" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-success" role="status" style="display: none;">
          <span class="visually-hidden">Loading more...</span>
        </div>
        <p class="mt-2 text-muted small" id="sentinel-text" style="display: none;">Loading more threads...</p>
      </div>

      <div id="scroll-end" class="text-center py-4 text-muted" style="display: none;">
        <i class="fa-solid fa-circle-check"></i> No more threads
      </div>
    </div>
  </div>
</div>
