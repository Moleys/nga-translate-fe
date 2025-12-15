<script>
  export let keyword = "";
</script>

<div class="row">
  <div class="col-lg-10 mx-auto">
    <div class="mb-4">
      <h1 class="display-6">Search Results</h1>
      <p class="text-muted" id="search-keyword">
        {#if keyword}Searching for: <strong>{keyword}</strong>{/if}
      </p>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs mb-4" id="search-tabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="threads-tab" data-bs-toggle="tab" data-bs-target="#threads" type="button" role="tab" aria-controls="threads" aria-selected="true">
          <i class="fa-solid fa-comment-dots"></i> Threads
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="forums-tab" data-bs-toggle="tab" data-bs-target="#forums" type="button" role="tab" aria-controls="forums" aria-selected="false">
          <i class="fa-solid fa-folder"></i> Forums
        </button>
      </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content" id="search-tab-content">
      <!-- Threads Tab -->
      <div class="tab-pane fade show active" id="threads" role="tabpanel" aria-labelledby="threads-tab">
        <div id="thread-results">
          <div class="text-center py-5">
            <div class="spinner-border text-success" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Searching threads...</p>
          </div>
        </div>

        <div id="thread-sentinel" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-success" role="status" style="display: none;">
            <span class="visually-hidden">Loading more...</span>
          </div>
          <p class="mt-2 text-muted small" id="thread-sentinel-text" style="display: none;">Loading more...</p>
        </div>

        <div id="thread-end" class="text-center py-4 text-muted" style="display: none;">
          <i class="fa-solid fa-circle-check"></i> No more results
        </div>
      </div>

      <!-- Forums Tab -->
      <div class="tab-pane fade" id="forums" role="tabpanel" aria-labelledby="forums-tab">
        <div id="forum-results">
          <div class="text-center py-5">
            <div class="spinner-border text-success" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Searching forums...</p>
          </div>
        </div>

        <div id="forum-sentinel" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-success" role="status" style="display: none;">
            <span class="visually-hidden">Loading more...</span>
          </div>
          <p class="mt-2 text-muted small" id="forum-sentinel-text" style="display: none;">Loading more...</p>
        </div>

        <div id="forum-end" class="text-center py-4 text-muted" style="display: none;">
          <i class="fa-solid fa-circle-check"></i> No more results
        </div>
      </div>
    </div>
  </div>
</div>
