<script>
  export let tid = '';
</script>

<div class="row">
  <div class="col-lg-10 mx-auto">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb" id="thread-breadcrumb">
        <li class="breadcrumb-item"><a href="/"><i class="fa-solid fa-house"></i> Home</a></li>
        <li class="breadcrumb-item"><span class="placeholder-glow"><span class="placeholder col-8"></span></span></li>
      </ol>
    </nav>

    <div class="mb-4">
      <h1 class="display-6" id="thread-title">Loading...</h1>
      <p class="text-muted" id="thread-info">Thread ID: {tid}</p>
      <div class="btn-group">
        <button type="button" class="btn btn-outline-secondary btn-sm" on:click={() => history.back()}>
          <i class="fa-solid fa-arrow-left"></i> Back
        </button>
        <button id="bookmark-btn" class="btn btn-outline-warning btn-sm" title="Bookmark this thread">
          <i class="fa-regular fa-bookmark"></i>
        </button>
      </div>
    </div>

    <div id="thread-posts" data-tid={tid}>
      <div id="posts-list">
        <div class="text-center py-5">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Loading posts...</p>
        </div>
      </div>

      <div id="pagination-container" class="my-4"></div>
    </div>
  </div>
</div>

<div class="modal fade" id="glossaryEditModal" tabindex="-1" aria-labelledby="glossaryEditModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="glossaryEditModalLabel">Edit Glossary</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="ThreadReader?.closeGlossaryModal?.()"></button>
      </div>
      <div class="modal-body">
        <div class="center frmUpdate mb-2">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex gap-1">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="glossary-prevLeft" title="Expand left">
                <i class="fa fa-chevron-left"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" id="glossary-prevRight" title="Shrink left">
                <i class="fa fa-chevron-right"></i>
              </button>
            </div>

            <div class="flex-grow-1 mx-2" style="font-size: 90%; overflow-x: auto; white-space: nowrap;">
              <span id="glossary-raw-left" style="color:#e7b3b3"></span>
              <span style="font-weight: bold; color:#fc5185;" id="glossary-raw-text"></span>
              <span id="glossary-raw-right" style="color:#e7b3b3"></span>
            </div>

            <div class="d-flex gap-1">
              <button type="button" class="btn btn-sm btn-outline-secondary" id="glossary-nextLeft" title="Shrink right">
                <i class="fa fa-chevron-left"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" id="glossary-nextRight" title="Expand right">
                <i class="fa fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
        <hr class="my-2">

        <div class="d-flex justify-content-between align-items-center mb-2">
          <span id="glossary-word-suggestion" class="small flex-grow-1"></span>
          <div class="d-flex gap-1">
            <button type="button" class="btn btn-danger btn-sm p-1" title="Empty" onclick="ThreadReader.emptyGlossaryInput()">
              <i class="fa fa-eraser"></i>
            </button>
            <button type="button" class="btn btn-success btn-sm p-1" title="Copy text raw" onclick="ThreadReader.copyGlossaryRaw()">
              <i class="fa fa-copy"></i>
            </button>
          </div>
        </div>

        <textarea rows="2" class="w-100 mb-2" style="font-size:90%" id="glossary-meaning-input" placeholder="Enter translation"></textarea>

        <p class="small mb-2"><span id="glossary-dict-suggestion"></span></p>

        <div style="font-size:80%" class="mb-2">
          <div class="d-flex flex-wrap align-items-center mb-1">
            <div class="me-2"><i class="fa fa-text-height"></i> Capitalize:</div>
            <div>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.setCapWords(1)">1</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.setCapWords(2)">2</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.setCapWords(3)">3</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.setCapWords(30)">All</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.setCapWords(0)">None</span>
            </div>
          </div>
          <div class="d-flex flex-wrap align-items-center mb-1">
            <div class="me-2"><i class="fa fa-language"></i> Translate:</div>
            <div class="d-flex flex-wrap gap-1">
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryPhienAm()">
                Phiên Âm
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryMoldich()">
                <span>🇯🇵</span> Moldich
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryGemini('vi')">
                <span>🇻🇳</span> Gemini
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryGemini('jp')">
                <span>🇯🇵</span> Gemini
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryGemini('en')">
                <span>🇺🇸</span> Gemini
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryGoogle('vi')">
                <span>🇻🇳</span> Google
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryGoogle('en')">
                <span>🇺🇸</span> Google
              </span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.translateGlossaryDeepL()">
                <span>🇺🇸</span> DeepL
              </span>
            </div>
          </div>
          <div class="d-flex flex-wrap align-items-center">
            <div class="me-2"><i class="fa fa-search"></i> Search:</div>
            <div>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.openGoogleTranslate()">GTrans</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.openGoogle()">Google</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.openHanzii()">Hanzii</span>
              <span class="badge bg-info" style="cursor:pointer" onclick="ThreadReader.openMdbg()">Mdbg</span>
            </div>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="ThreadReader?.closeGlossaryModal?.()">Cancel</button>
        <button type="button" class="btn btn-success" id="glossary-save-btn">Save</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="ocrModal" tabindex="-1" aria-labelledby="ocrModalLabel" aria-hidden="true" data-bs-backdrop="true" data-bs-keyboard="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="ocrModalLabel">Image OCR</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="ThreadReader?.closeOcrModal?.()"></button>
      </div>
      <div class="modal-body">
        <div class="mb-2">
          <div class="progress" style="height: 6px;">
            <div id="ocr-progress" class="progress-bar" role="progressbar" style="width: 0%"></div>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label" for="ocr-text">OCR Text</label>
          <textarea id="ocr-text" class="form-control" rows="6" placeholder="Recognizing..." spellcheck="false"></textarea>
        </div>
        <div class="mb-2 d-flex gap-2 flex-wrap">
          <button type="button" class="btn btn-sm btn-outline-secondary" id="ocr-copy-text">Copy Text</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="ocr-fix-breaks">Fix Line Breaks</button>
          <button type="button" class="btn btn-sm btn-outline-success" id="ocr-translate-btn">Translate</button>
        </div>
        <hr>
        <div>
          <p class="form-label mb-1">Translation</p>
          <div id="ocr-translation" class="border rounded p-3" style="min-height: 120px; white-space: pre-wrap;">Waiting...</div>
          <div class="mt-2 d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" id="ocr-copy-translation">Copy Translation</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="ThreadReader?.closeOcrModal?.()">Close</button>
      </div>
    </div>
  </div>
</div>
