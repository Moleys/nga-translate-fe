<div class="row">
  <div class="col-lg-6 mx-auto">
    <div class="card shadow-sm">
      <div class="card-body p-5">
        <div class="text-center mb-4">
          <i class="fa-solid fa-lock display-1 text-success"></i>
          <h2 class="mt-3">NGA Account Login</h2>
          <p class="text-muted">Enter your NGA authentication credentials</p>
        </div>

        <div id="login-status" class="alert d-none" role="alert"></div>

        <form id="login-form">
          <div class="mb-3">
            <label for="access_uid" class="form-label">
              <i class="fa-solid fa-id-badge"></i> User ID (access_uid)
            </label>
            <input type="text" class="form-control" id="access_uid" placeholder="e.g., 64326084" required>
            <div class="form-text">Your NGA user ID</div>
          </div>

          <div class="mb-3">
            <label for="access_token" class="form-label">
              <i class="fa-solid fa-key"></i> Access Token
            </label>
            <input type="text" class="form-control" id="access_token" placeholder="e.g., X9bibk3o63p3eao96qb1i5..." required>
            <div class="form-text">Your NGA access token (alphanumeric string)</div>
          </div>

          <div class="mb-4">
            <label for="app_id" class="form-label">
              <i class="fa-solid fa-mobile-screen-button"></i> App ID
            </label>
            <input type="text" class="form-control" id="app_id" value="1010" required>
            <div class="form-text">Usually 1010 (default)</div>
          </div>

          <div class="d-grid gap-2">
            <button type="submit" class="btn btn-success btn-lg">
              <i class="fa-solid fa-right-to-bracket"></i> Save Credentials
            </button>
            <button type="button" class="btn btn-outline-secondary" id="logout-btn">
              <i class="fa-solid fa-right-from-bracket"></i> Clear Credentials
            </button>
          </div>
        </form>

        <div class="mt-4 p-3 bg-light rounded">
          <h6 class="mb-2"><i class="fa-solid fa-circle-info"></i> How to get your credentials:</h6>
          <ol class="mb-0 small">
            <li>Use NGA official Android app</li>
            <li>Login to your account</li>
            <li>Use network monitoring tool (e.g., HTTP Canary, Charles Proxy)</li>
            <li>Capture API requests to find <code>access_uid</code> and <code>access_token</code></li>
            <li>Copy these values here</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</div>
