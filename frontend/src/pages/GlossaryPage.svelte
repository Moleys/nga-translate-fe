<div class="row">
  <div class="col-lg-9 mx-auto">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">Glossary</h1>
      <div class="btn-group">
        <button class="btn btn-sm btn-success" id="glossary-export-btn"><i class="fa-solid fa-download"></i> Export</button>
        <button class="btn btn-sm btn-success" id="glossary-import-btn"><i class="fa-solid fa-upload"></i> Import</button>
        <button class="btn btn-sm btn-danger" id="glossary-clear-btn"><i class="fa-solid fa-trash"></i> Clear</button>
      </div>
    </div>

    <p class="text-muted">Format: one entry per line as <code>Raw=Meaning</code>. This glossary is used to assist translation.</p>

    <textarea id="glossary-text" class="form-control" rows="16" spellcheck="false" placeholder="玩=chơi&#10;主角=nhân vật chính"></textarea>

    <div class="mt-3 d-flex justify-content-end">
      <button class="btn btn-success" id="glossary-save-btn-page"><i class="fa-solid fa-floppy-disk"></i> Save</button>
    </div>

    <input type="file" id="glossary-file-input" accept="text/plain" style="display:none">
  </div>
</div>
