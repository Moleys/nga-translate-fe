<div class="row">
  <div class="col-lg-10 mx-auto">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="display-6"><i class="fa-solid fa-star text-warning"></i> My Favorite Forums</h1>
        <p class="lead text-muted">Quick access to your favorite forums</p>
      </div>
    </div>

    <!-- Favorite Forums -->
    <div id="favorite-forums"></div>

    <!-- Empty State -->
    <div id="empty-state" style="display: none;" class="text-center py-5">
      <i class="fa-regular fa-star display-1 text-muted"></i>
      <h3 class="mt-3">No Favorites Yet</h3>
      <p class="text-muted">Browse all forums and add your favorites!</p>
      <a href="/forums" class="btn btn-success btn-lg mt-3">
        <i class="fa-solid fa-table-cells"></i> Explore Forums
      </a>
    </div>

    <!-- Thread History Section -->
    <div class="mt-5">
      <h2 class="h4 mb-3"><i class="fa-solid fa-clock-rotate-left"></i> Recently Viewed Threads</h2>
      <div id="thread-history"></div>
    </div>
  </div>
</div>
