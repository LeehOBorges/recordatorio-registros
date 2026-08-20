/* =========================================================
   RECORDATÓRIO + REGISTROS
   MÓDULO DE RELATÓRIOS E PDF
   Arquivo separado do app.js principal
========================================================= */

(function () {

  "use strict";

  const STORAGE_KEY =
    "recordatorio_registros_v01";

  const REPORT_TYPES = {

    all: "Todos os registros",

    meal: "Refeições",

    glucose: "Glicemias",

    insulin: "Insulina",

    activity: "Atividades",

    medication:
      "Medicamentos / Suplementos / Vitaminas",

    consultation:
      "Consultas"

  };


  /* =====================================================
     ELEMENTOS
  ====================================================== */

  let reportsButton = null;

  let reportsScreen = null;

  let startDateInput = null;

  let endDateInput = null;

  let reportTypeSelect = null;

  let previewButton = null;

  let downloadButton = null;

  let previewContainer = null;

  let previewContent = null;


  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  function initReports() {

    reportsButton =
      document.getElementById(
        "reportsButton"
      );

    reportsScreen =
      document.getElementById(
        "reportsScreen"
      );

    startDateInput =
      document.getElementById(
        "reportStartDate"
      );

    endDateInput =
      document.getElementById(
        "reportEndDate"
      );

    reportTypeSelect =
      document.getElementById(
        "reportType"
      ) ||
      document.getElementById(
        "reportTypeSelect"
      );

    previewButton =
      document.getElementById(
        "previewReportButton"
      );

    downloadButton =
      document.getElementById(
        "downloadReportButton"
      );

    previewContainer =
      document.getElementById(
        "reportPreview"
      );

    previewContent =
      document.getElementById(
        "reportPreviewContent"
      );


    if (!reportsScreen) {

      console.warn(
        "Tela de relatórios não encontrada."
      );

      return;

    }


    setDefaultDates();

    bindEvents();

  }


  /* =====================================================
     DATAS PADRÃO
  ====================================================== */

  function formatDateKey(date) {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day
    );

  }


  function setDefaultDates() {

    if (!startDateInput || !endDateInput) {
      return;
    }


    const today =
      new Date();


    if (!startDateInput.value) {

      const start =
        new Date();

      start.setDate(
        start.getDate() - 30
      );

      startDateInput.value =
        formatDateKey(start);

    }


    if (!endDateInput.value) {

      endDateInput.value =
        formatDateKey(today);

    }

  }


  /* =====================================================
     EVENTOS
  ====================================================== */

  function bindEvents() {

    if (reportsButton) {

      reportsButton.addEventListener(
        "click",
        function () {

          openReportsScreen();

        }
      );

    }


    if (previewButton) {

      previewButton.addEventListener(
        "click",
        function () {

          generatePreview();

        }
      );

    }


    if (downloadButton) {

      downloadButton.addEventListener(
        "click",
        function () {

          downloadPDF();

        }
      );

    }

  }


  /* =====================================================
     ABRIR RELATÓRIOS
  ====================================================== */

  function openReportsScreen() {

    if (
      typeof window.showScreen ===
      "function"
    ) {

      window.showScreen(
        "reportsScreen"
      );

    } else {

      document
        .querySelectorAll(
          ".app-screen"
        )
        .forEach(
          function (screen) {

            screen.hidden = true;

          }
        );

      if (reportsScreen) {

        reportsScreen.hidden =
          false;

      }

    }


    setDefaultDates();

  }


  /* =====================================================
     BUSCAR NOME DO USUÁRIO
  ====================================================== */

  async function getCurrentUserName() {

    const fallback =
      "Usuário";

    try {

      if (
        typeof window.supabaseClient ===
        "undefined" ||
        !window.supabaseClient ||
        !window.supabaseClient.auth
      ) {

        return fallback;

      }


      const {
        data,
        error
      } =
        await window.supabaseClient.auth.getUser();


      if (error) {

        console.warn(
          "Não foi possível obter os dados do usuário:",
          error
        );

        return fallback;

      }


      const user =
        data &&
        data.user
          ? data.user
          : null;


      if (!user) {

        return fallback;

      }


      const metadata =
        user.user_metadata ||
        {};


      const name =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name ||
        metadata.nome ||
        "";


      if (
        String(name).trim()
      ) {

        return String(
          name
        ).trim();

      }


      if (user.email) {

        return user.email;

      }


      return fallback;

    } catch (error) {

      console.error(
        "Erro ao obter nome do usuário:",
        error
      );

      return fallback;

    }

  }


  /* =====================================================
     BANCO DE DADOS
  ====================================================== */

  function loadDatabase() {

    try {

      const stored =
        localStorage.getItem(
          STORAGE_KEY
        );


      if (!stored) {

        return {

          records: [],

          trash: []

        };

      }


      const parsed =
        JSON.parse(
          stored
        );


      return {

        records:
          Array.isArray(
            parsed.records
          )
            ? parsed.records
            : [],

        trash:
          Array.isArray(
            parsed.trash
          )
            ? parsed.trash
            : []

      };

    } catch (error) {

      console.error(
        "Erro ao carregar registros para relatório:",
        error
      );


      return {

        records: [],

        trash: []

      };

    }

  }


  /* =====================================================
     FILTRAR REGISTROS
  ====================================================== */

  function getFilteredRecords() {

    const database =
      loadDatabase();


    let records =
      database.records;


    const startDate =
      startDateInput
        ? startDateInput.value
        : "";


    const endDate =
      endDateInput
        ? endDateInput.value
        : "";


    const reportType =
      reportTypeSelect
        ? reportTypeSelect.value
        : "all";


    if (startDate) {

      records =
        records.filter(
          function (record) {

            return (
              String(
                record.date || ""
              ) >= startDate
            );

          }
        );

    }


    if (endDate) {

      records =
        records.filter(
          function (record) {

            return (
              String(
                record.date || ""
              ) <= endDate
            );

          }
        );

    }


    if (
      reportType &&
      reportType !== "all"
    ) {

      records =
        records.filter(
          function (record) {

            return (
              record.type ===
              reportType
            );

          }
        );

    }


    records.sort(
      function (a, b) {

        const dateA =
          String(
            a.date || ""
          );

        const dateB =
          String(
            b.date || ""
          );


        if (dateA !== dateB) {

          return dateA.localeCompare(
            dateB
          );

        }


        return String(
          a.time || ""
        ).localeCompare(
          String(
            b.time || ""
          )
        );

      }
    );


    return records;

  }


  /* =====================================================
     FORMATAÇÕES
  ====================================================== */

  function formatDisplayDate(
    dateValue
  ) {

    if (!dateValue) {

      return "";

    }


    const parts =
      String(
        dateValue
      ).split("-");


    if (parts.length !== 3) {

      return dateValue;

    }


    return (
      parts[2] +
      "/" +
      parts[1] +
      "/" +
      parts[0]
    );

  }


  function escapeHTML(value) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  function getTypeLabel(type) {

    return (
      REPORT_TYPES[type] ||
      "Registro"
    );

  }


  function getRecordTitle(
    record
  ) {

    if (
      record.type === "meal"
    ) {

      return (
        record.mealType ||
        "Refeição"
      );

    }


    if (
      record.type === "glucose"
    ) {

      return (
        "Glicemia: " +
        (
          record.value ??
          ""
        ) +
        " mg/dL"
      );

    }


    if (
      record.type === "insulin"
    ) {

      return (
        "Insulina: " +
        (
          record.dose ??
          ""
        ) +
        " U"
      );

    }


    if (
      record.type === "activity"
    ) {

      return (
        record.activity ||
        "Atividade"
      );

    }


    if (
      record.type ===
      "medication"
    ) {

      return (
        record.medicationName ||
        "Medicamento / suplemento / vitamina"
      );

    }


    if (
      record.type ===
      "consultation"
    ) {

      return (
        record.specialty ||
        "Consulta"
      );

    }


    return "Registro";

  }


  function getRecordDetails(
    record
  ) {

    const details = [];


    if (record.type === "meal") {

      if (record.food) {

        details.push(
          "Alimento: " +
          record.food
        );

      }


      if (record.quantity) {

        details.push(
          "Quantidade: " +
          record.quantity
        );

      }


      if (record.notes) {

        details.push(
          "Observações: " +
          record.notes
        );

      }

    }


    else if (
      record.type ===
      "glucose"
    ) {

      if (record.kind) {

        details.push(
          record.kind
        );

      }


      if (record.notes) {

        details.push(
          "Observações: " +
          record.notes
        );

      }

    }


    else if (
      record.type ===
      "insulin"
    ) {

      if (record.insulin) {

        details.push(
          "Tipo: " +
          record.insulin
        );

      }


      if (
        record.application
      ) {

        details.push(
          "Aplicação: " +
          record.application
        );

      }


      if (record.notes) {

        details.push(
          "Observações: " +
          record.notes
        );

      }

    }


    else if (
      record.type ===
      "activity"
    ) {

      if (
        record.duration
      ) {

        details.push(
          "Duração: " +
          record.duration +
          " min"
        );

      }


      if (
        record.intensity
      ) {

        details.push(
          "Intensidade: " +
          record.intensity
        );

      }


      if (record.notes) {

        details.push(
          "Observações: " +
          record.notes
        );

      }

    }


    else if (
      record.type ===
      "medication"
    ) {

      if (record.period) {

        const periodLabels = {

          morning: "Manhã",

          afternoon: "Tarde",

          night: "Noite"

        };


        details.push(
          "Período: " +
          (
            periodLabels[
              record.period
            ] ||
            record.period
          )
        );

      }


      if (record.notes) {

        details.push(
          "Observações: " +
          record.notes
        );

      }

    }


    else if (
      record.type ===
      "consultation"
    ) {

      if (record.professional) {

        details.push(
          "Profissional: " +
          record.professional
        );

      }


      if (record.location) {

        details.push(
          "Local: " +
          record.location
        );

      }


      if (record.notes) {

        details.push(
          "Observações: " +
          record.notes
        );

      }

    }


    return details;

  }


  /* =====================================================
     PRÉVIA
  ====================================================== */

  function generatePreview() {

    if (!previewContent) {

      return;

    }


    const startDate =
      startDateInput
        ? startDateInput.value
        : "";


    const endDate =
      endDateInput
        ? endDateInput.value
        : "";


    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {

      previewContent.innerHTML = `
        <div class="empty-state">
          A data inicial não pode ser posterior
          à data final.
        </div>
      `;

      return;

    }


    const records =
      getFilteredRecords();


    if (records.length === 0) {

      previewContent.innerHTML = `
        <div class="empty-state">
          Nenhum registro encontrado
          para os filtros selecionados.
        </div>
      `;

      return;

    }


    let html = "";


    html += `
      <div
        style="
          margin-bottom:16px;
          padding:12px;
          border-radius:12px;
          background:#f8eeee;
        "
      >
        <strong>
          ${records.length}
          registro(s) encontrado(s)
        </strong>
      </div>
    `;


    records.forEach(
      function (record) {

        const title =
          getRecordTitle(
            record
          );


        const details =
          getRecordDetails(
            record
          );


        html += `
          <div
            class="report-preview-item"
          >

            <div
              style="
                font-weight:700;
                color:#7f4444;
                margin-bottom:4px;
              "
            >

              ${escapeHTML(
                formatDisplayDate(
                  record.date
                )
              )}

              ${
                record.time
                  ? " · " +
                    escapeHTML(
                      record.time
                    )
                  : ""
              }

            </div>

            <div
              style="
                font-weight:600;
                margin-bottom:4px;
              "
            >
              ${escapeHTML(
                getTypeLabel(
                  record.type
                )
              )}
              —
              ${escapeHTML(
                title
              )}
            </div>

            ${
              details.length
                ? `
                  <div
                    style="
                      color:#666;
                      line-height:1.5;
                    "
                  >
                    ${details
                      .map(
                        function (
                          detail
                        ) {

                          return escapeHTML(
                            detail
                          );

                        }
                      )
                      .join(
                        "<br>"
                      )
                    }
                  </div>
                `
                : ""
            }

          </div>
        `;

      }
    );


    previewContent.innerHTML =
      html;

  }


  /* =====================================================
     HTML DO PDF
  ====================================================== */

  async function buildPDFHTML() {

    const records =
      getFilteredRecords();


    const startDate =
      startDateInput
        ? startDateInput.value
        : "";


    const endDate =
      endDateInput
        ? endDateInput.value
        : "";


    const type =
      reportTypeSelect
        ? reportTypeSelect.value
        : "all";


    const userName =
      await getCurrentUserName();


    let recordsHTML = "";


    if (records.length === 0) {

      recordsHTML = `
        <div
          style="
            padding:20px;
            text-align:center;
            border:1px solid #ddd;
            border-radius:8px;
          "
        >
          Nenhum registro encontrado.
        </div>
      `;

    } else {

      records.forEach(
        function (record) {

          const details =
            getRecordDetails(
              record
            );


          recordsHTML += `
            <div
              style="
                border-bottom:
                  1px solid #ddd;
                padding:
                  10px 0 12px;
                page-break-inside:
                  avoid;
              "
            >

              <div
                style="
                  font-size:11px;
                  color:#777;
                  margin-bottom:3px;
                "
              >
                ${
                  escapeHTML(
                    formatDisplayDate(
                      record.date
                    )
                  )
                }
                ${
                  record.time
                    ? " · " +
                      escapeHTML(
                        record.time
                      )
                    : ""
                }
              </div>

              <div
                style="
                  font-weight:bold;
                  font-size:13px;
                  color:#7f4444;
                  margin-bottom:4px;
                "
              >
                ${escapeHTML(
                  getTypeLabel(
                    record.type
                  )
                )}
                —
                ${escapeHTML(
                  getRecordTitle(
                    record
                  )
                )}
              </div>

              ${
                details.length
                  ? `
                    <div
                      style="
                        font-size:11px;
                        line-height:1.5;
                        color:#444;
                      "
                    >
                      ${details
                        .map(
                          function (
                            detail
                          ) {

                            return escapeHTML(
                              detail
                            );

                          }
                        )
                        .join(
                          "<br>"
                        )
                      }
                    </div>
                  `
                  : ""
              }

            </div>
          `;

        }
      );

    }


    return `

      <div
        id="recordatorioPDF"
        style="
          width:100%;
          box-sizing:border-box;
          background:#fff;
          color:#222;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          padding:24px;
        "
      >

        <div
          style="
            border-bottom:
              2px solid #A85C5C;
            padding-bottom:12px;
            margin-bottom:16px;
          "
        >

          <div
            style="
              font-size:20px;
              font-weight:bold;
              color:#7f4444;
            "
          >
            Recordatório + Registros
          </div>

          <div
            style="
              font-size:15px;
              font-weight:bold;
              color:#333;
              margin-top:6px;
            "
          >
            ${escapeHTML(
              userName
            )}
          </div>

          <div
            style="
              font-size:13px;
              margin-top:5px;
              color:#555;
            "
          >
            Relatório de registros
          </div>

        </div>


        <div
          style="
            font-size:11px;
            color:#555;
            line-height:1.5;
            margin-bottom:16px;
          "
        >

          <strong>
            Período:
          </strong>

          ${
            startDate
              ? escapeHTML(
                  formatDisplayDate(
                    startDate
                  )
                )
              : "início"
          }

          até

          ${
            endDate
              ? escapeHTML(
                  formatDisplayDate(
                    endDate
                  )
                )
              : "fim"
          }

          <br>

          <strong>
            Tipo:
          </strong>

          ${escapeHTML(
            REPORT_TYPES[
              type
            ] ||
            "Todos os registros"
          )}

          <br>

          <strong>
            Total:
          </strong>

          ${records.length}

        </div>


        ${recordsHTML}


        <div
          style="
            margin-top:20px;
            padding-top:8px;
            border-top:
              1px solid #ddd;
            font-size:9px;
            color:#888;
            text-align:center;
          "
        >
          Relatório gerado pelo
          Recordatório + Registros.
        </div>

      </div>

    `;

  }


  /* =====================================================
     CARREGAR HTML2PDF
  ====================================================== */

  function loadHtml2Pdf() {

    return new Promise(
      function (
        resolve,
        reject
      ) {

        if (
          typeof window.html2pdf ===
          "function"
        ) {

          resolve();

          return;

        }


        const existingScript =
          document.querySelector(
            'script[data-html2pdf="true"]'
          );


        if (existingScript) {

          existingScript.addEventListener(
            "load",
            function () {

              if (
                typeof window.html2pdf ===
                "function"
              ) {

                resolve();

              } else {

                reject(
                  new Error(
                    "html2pdf não foi carregado."
                  )
                );

              }

            }
          );


          existingScript.addEventListener(
            "error",
            function () {

              reject(
                new Error(
                  "Não foi possível carregar a biblioteca PDF."
                )
              );

            }
          );


          return;

        }


        const script =
          document.createElement(
            "script"
          );


        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

        script.async = true;

        script.dataset.html2pdf =
          "true";


        script.onload =
          function () {

            if (
              typeof window.html2pdf ===
              "function"
            ) {

              resolve();

            } else {

              reject(
                new Error(
                  "A biblioteca PDF foi carregada, mas não está disponível."
                )
              );

            }

          };


        script.onerror =
          function () {

            reject(
              new Error(
                "Não foi possível carregar a biblioteca PDF. Verifique sua conexão com a internet."
              )
            );

          };


        document.head.appendChild(
          script
        );

      }
    );

  }


  /* =====================================================
     BAIXAR PDF
  ====================================================== */

  async function downloadPDF() {

    const startDate =
      startDateInput
        ? startDateInput.value
        : "";


    const endDate =
      endDateInput
        ? endDateInput.value
        : "";


    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {

      alert(
        "A data inicial não pode ser posterior à data final."
      );

      return;

    }


    const records =
      getFilteredRecords();


    if (records.length === 0) {

      alert(
        "Nenhum registro foi encontrado para gerar o PDF."
      );

      return;

    }


    const originalText =
      downloadButton
        ? downloadButton.textContent
        : "";


    if (downloadButton) {

      downloadButton.disabled =
        true;

      downloadButton.textContent =
        "⏳ Gerando PDF...";

    }


    try {

      await loadHtml2Pdf();


      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.innerHTML =
        await buildPDFHTML();


      wrapper.style.position =
        "fixed";

      wrapper.style.left =
        "-100000px";

      wrapper.style.top =
        "0";

      wrapper.style.width =
        "794px";

      wrapper.style.background =
        "#ffffff";

      wrapper.style.zIndex =
        "-1";


      document.body.appendChild(
        wrapper
      );


      const element =
        wrapper.firstElementChild;


      const safeStart =
        startDate ||
        "inicio";


      const safeEnd =
        endDate ||
        "fim";


      const filename =
        "recordatorio_relatorio_" +
        safeStart +
        "_a_" +
        safeEnd +
        ".pdf";


      const options = {

        margin: [
          10,
          10,
          10,
          10
        ],

        filename,

        image: {
          type: "jpeg",
          quality: 0.98
        },

        html2canvas: {

          scale: 2,

          useCORS: true,

          backgroundColor:
            "#ffffff"

        },

        jsPDF: {

          unit: "mm",

          format: "a4",

          orientation:
            "portrait"

        },

        pagebreak: {

          mode: [
            "css",
            "legacy"
          ]

        }

      };


      await window.html2pdf()
        .set(options)
        .from(element)
        .save();


      wrapper.remove();


    } catch (error) {

      console.error(
        "Erro ao gerar PDF:",
        error
      );


      alert(
        "Não foi possível gerar o PDF. Verifique sua conexão com a internet e tente novamente."
      );

    } finally {

      if (downloadButton) {

        downloadButton.disabled =
          false;

        downloadButton.textContent =
          originalText ||
          "📄 Baixar PDF";

      }

    }

  }


  /* =====================================================
     INICIALIZAR
  ====================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initReports
    );

  } else {

    initReports();

  }


})();
