/* =========================================================
   RECORDATÓRIO + REGISTROS
   RELATÓRIOS EM PDF
   =========================================================
   
   Este arquivo é independente do app.js.
   
   Recursos:
   - Seleção do tipo de relatório
   - Data inicial
   - Data final
   - Contagem de registros
   - Pré-visualização
   - Geração de PDF
   - Relatórios organizados por data
   - Funciona com os registros existentes em localStorage
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     CONFIGURAÇÕES
  ======================================================= */

  const STORAGE_KEY =
    "recordatorio_registros_v01";

  const WATER_SETTINGS_KEY =
    "recordatorio_agua_config_v01";


  const PDF_LIBRARY_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";


  /* =======================================================
     TIPOS DE RELATÓRIO
  ======================================================= */

  const REPORT_TYPES = {

    meal: {
      label: "🍽️ Recordatório alimentar",
      icon: "🍽️",
      title: "Recordatório Alimentar",
      type: "meal"
    },

    glucose: {
      label: "🩸 Glicemias",
      icon: "🩸",
      title: "Relatório de Glicemias",
      type: "glucose"
    },

    insulin: {
      label: "💉 Insulina",
      icon: "💉",
      title: "Relatório de Insulina",
      type: "insulin"
    },

    activity: {
      label: "🏋️ Atividades físicas",
      icon: "🏋️",
      title: "Relatório de Atividades Físicas",
      type: "activity"
    },

    medication: {
      label: "💊 Medicamentos / suplementos / vitaminas",
      icon: "💊",
      title: "Relatório de Medicamentos, Suplementos e Vitaminas",
      type: "medication"
    },

    consultation: {
      label: "🩺 Consultas",
      icon: "🩺",
      title: "Relatório de Consultas",
      type: "consultation"
    },

    water: {
      label: "💧 Água",
      icon: "💧",
      title: "Relatório de Hidratação",
      type: "water"
    },

    all: {
      label: "📋 Todos os registros",
      icon: "📋",
      title: "Relatório Completo",
      type: "all"
    }

  };


  /* =======================================================
     ESTADO
  ======================================================= */

  let reportScreen = null;

  let reportTypeSelect = null;

  let reportStartDate = null;

  let reportEndDate = null;

  let reportCount = null;

  let reportPreview = null;

  let reportGenerateButton = null;

  let reportPreviewButton = null;

  let reportStatus = null;

  let pdfLibraryPromise = null;


  /* =======================================================
     UTILITÁRIOS
  ======================================================= */

  function escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function formatDateKey(date) {

    const year =
      date.getFullYear();

    const month =
      String(date.getMonth() + 1)
        .padStart(2, "0");

    const day =
      String(date.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;

  }


  function todayKey() {

    return formatDateKey(
      new Date()
    );

  }


  function formatDateBR(dateKey) {

    if (!dateKey) {
      return "";
    }

    const parts =
      String(dateKey).split("-");

    if (parts.length !== 3) {
      return dateKey;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

  }


  function formatLongDate(dateKey) {

    if (!dateKey) {
      return "";
    }

    const date =
      new Date(
        `${dateKey}T12:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return formatDateBR(dateKey);
    }

    return date.toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    );

  }


  function formatGeneratedDate() {

    return new Date().toLocaleString(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short"
      }
    );

  }


  function sanitizeFileName(value) {

    return String(value || "")
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .toLowerCase();

  }


  function getDatabase() {

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
        JSON.parse(stored);

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


  function getRecords() {

    const database =
      getDatabase();

    return database.records;

  }


  function getWaterGoal() {

    try {

      const stored =
        localStorage.getItem(
          WATER_SETTINGS_KEY
        );

      if (!stored) {
        return 2000;
      }

      const parsed =
        JSON.parse(stored);

      return Number(
        parsed.dailyGoal || 2000
      );

    } catch (error) {

      return 2000;

    }

  }


  /* =======================================================
     CARREGAR BIBLIOTECA PDF
  ======================================================= */

  function loadPdfLibrary() {

    if (
      window.html2pdf
    ) {

      return Promise.resolve(
        window.html2pdf
      );

    }


    if (pdfLibraryPromise) {

      return pdfLibraryPromise;

    }


    pdfLibraryPromise =
      new Promise(
        function (resolve, reject) {

          const existing =
            document.querySelector(
              'script[data-report-pdf-library="true"]'
            );

          if (existing) {

            existing.addEventListener(
              "load",
              function () {

                if (
                  window.html2pdf
                ) {

                  resolve(
                    window.html2pdf
                  );

                } else {

                  reject(
                    new Error(
                      "A biblioteca de PDF não foi carregada."
                    )
                  );

                }

              }
            );

            existing.addEventListener(
              "error",
              function () {

                reject(
                  new Error(
                    "Não foi possível carregar a biblioteca de PDF."
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
            PDF_LIBRARY_URL;

          script.async = true;

          script.dataset.reportPdfLibrary =
            "true";


          script.onload =
            function () {

              if (
                window.html2pdf
              ) {

                resolve(
                  window.html2pdf
                );

              } else {

                reject(
                  new Error(
                    "A biblioteca html2pdf não está disponível."
                  )
                );

              }

            };


          script.onerror =
            function () {

              reject(
                new Error(
                  "Não foi possível carregar a biblioteca de PDF."
                )
              );

            };


          document.head.appendChild(
            script
          );

        }
      );


    return pdfLibraryPromise;

  }


  /* =======================================================
     FILTRO POR PERÍODO
  ======================================================= */

  function validatePeriod() {

    const start =
      reportStartDate
        ? reportStartDate.value
        : "";

    const end =
      reportEndDate
        ? reportEndDate.value
        : "";


    if (!start || !end) {

      return {
        valid: false,
        message:
          "Selecione a data inicial e a data final."
      };

    }


    if (start > end) {

      return {
        valid: false,
        message:
          "A data inicial não pode ser posterior à data final."
      };

    }


    return {
      valid: true,
      start,
      end
    };

  }


  function getFilteredRecords() {

    const validation =
      validatePeriod();

    if (!validation.valid) {

      return [];

    }


    const type =
      reportTypeSelect
        ? reportTypeSelect.value
        : "all";


    const records =
      getRecords();


    return records

      .filter(
        function (record) {

          if (!record || !record.date) {
            return false;
          }

          if (
            record.date <
            validation.start
          ) {
            return false;
          }

          if (
            record.date >
            validation.end
          ) {
            return false;
          }

          if (type === "all") {
            return true;
          }

          return record.type === type;

        }
      )

      .sort(
        function (a, b) {

          const dateCompare =
            String(a.date || "")
              .localeCompare(
                String(b.date || "")
              );

          if (
            dateCompare !== 0
          ) {

            return dateCompare;

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

  }


  /* =======================================================
     AGRUPAR POR DATA
  ======================================================= */

  function groupByDate(records) {

    const groups = {};

    records.forEach(
      function (record) {

        const date =
          record.date ||
          "sem-data";

        if (!groups[date]) {

          groups[date] = [];

        }

        groups[date].push(
          record
        );

      }
    );

    return groups;

  }


  /* =======================================================
     NOME DO TIPO
  ======================================================= */

  function getTypeDefinition(
    type
  ) {

    return (
      REPORT_TYPES[type] ||
      REPORT_TYPES.all
    );

  }


  function getTypeLabel(
    type
  ) {

    const definition =
      getTypeDefinition(type);

    return definition.title;

  }


  /* =======================================================
     RESUMO
  ======================================================= */

  function calculateSummary(
    records
  ) {

    const summary = {

      total: records.length,

      meals: 0,

      glucose: 0,

      insulin: 0,

      activity: 0,

      activityMinutes: 0,

      medication: 0,

      consultation: 0,

      waterEntries: 0,

      waterTotal: 0

    };


    records.forEach(
      function (record) {

        if (
          record.type === "meal"
        ) {

          summary.meals++;

        }


        if (
          record.type === "glucose"
        ) {

          summary.glucose++;

        }


        if (
          record.type === "insulin"
        ) {

          summary.insulin++;

        }


        if (
          record.type === "activity"
        ) {

          summary.activity++;

          summary.activityMinutes +=
            Number(
              record.duration || 0
            );

        }


        if (
          record.type === "medication"
        ) {

          summary.medication++;

        }


        if (
          record.type === "consultation"
        ) {

          summary.consultation++;

        }


        if (
          record.type === "water"
        ) {

          summary.waterEntries++;

          summary.waterTotal +=
            Number(
              record.amount || 0
            );

        }

      }
    );


    return summary;

  }


  /* =======================================================
     FORMATAÇÃO DOS REGISTROS
  ======================================================= */

  function getRecordDetails(
    record
  ) {

    if (
      record.type === "meal"
    ) {

      return {

        title:
          record.mealType ||
          "Refeição",

        fields: [

          [
            "Alimentos",
            record.food
          ],

          [
            "Quantidade",
            record.quantity
          ],

          [
            "Observação",
            record.note
          ]

        ]

      };

    }


    if (
      record.type === "glucose"
    ) {

      return {

        title:
          record.value !== undefined &&
          record.value !== null &&
          record.value !== ""
            ? `${record.value} mg/dL`
            : "Glicemia",

        fields: [

          [
            "Momento",
            record.kind
          ],

          [
            "Observação",
            record.note
          ]

        ]

      };

    }


    if (
      record.type === "insulin"
    ) {

      return {

        title:
          record.insulin ||
          "Insulina",

        fields: [

          [
            "Dose",
            record.dose !== undefined &&
            record.dose !== ""
              ? `${record.dose} U`
              : ""
          ],

          [
            "Aplicação",
            record.application
          ],

          [
            "Observação",
            record.note
          ]

        ]

      };

    }


    if (
      record.type === "activity"
    ) {

      return {

        title:
          record.activity ||
          "Atividade física",

        fields: [

          [
            "Duração",
            record.duration !== undefined &&
            record.duration !== ""
              ? `${record.duration} min`
              : ""
          ],

          [
            "Intensidade",
            record.intensity
          ],

          [
            "Observação",
            record.note
          ]

        ]

      };

    }


    if (
      record.type === "medication"
    ) {

      const periods = {

        morning: "Manhã",

        afternoon: "Tarde",

        night: "Noite"

      };


      return {

        title:
          record.medicationName ||
          "Medicamento / suplemento / vitamina",

        fields: [

          [
            "Período",
            periods[
              record.period
            ] ||
            record.period
          ],

          [
            "Status",
            record.taken === true
              ? "Tomado"
              : "Registrado"
          ]

        ]

      };

    }


    if (
      record.type === "consultation"
    ) {

      return {

        title:
          record.specialty ||
          "Consulta",

        fields: [

          [
            "Profissional",
            record.professional
          ],

          [
            "Especialidade",
            record.specialty
          ],

          [
            "Local",
            record.location
          ],

          [
            "Motivo",
            record.reason
          ],

          [
            "Observações",
            record.note
          ]

        ]

      };

    }


    if (
      record.type === "water"
    ) {

      const amount =
        Number(
          record.amount || 0
        );


      let amountLabel =
        `${amount} ml`;

      if (
        amount >= 1000 &&
        amount % 1000 === 0
      ) {

        amountLabel =
          `${amount / 1000} L`;

      }


      return {

        title:
          amount >= 0
            ? "Água adicionada"
            : "Água retirada",

        fields: [

          [
            "Quantidade",
            amountLabel
          ],

          [
            "Ação",
            record.action === "remove"
              ? "Retirada"
              : "Adicionada"
          ]

        ]

      };

    }


    return {

      title:
        record.type ||
        "Registro",

      fields: []

    };

  }


  /* =======================================================
     HTML DO REGISTRO
  ======================================================= */

  function createRecordHTML(
    record
  ) {

    const details =
      getRecordDetails(
        record
      );


    let fieldsHTML = "";


    details.fields.forEach(
      function (field) {

        const label =
          field[0];

        const value =
          field[1];


        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {

          return;

        }


        fieldsHTML += `

          <div class="report-field">

            <span class="report-field-label">
              ${escapeHTML(label)}
            </span>

            <span class="report-field-value">
              ${escapeHTML(value)}
            </span>

          </div>

        `;

      }
    );


    return `

      <div class="report-record">

        <div class="report-record-header">

          <span class="report-record-time">
            ${escapeHTML(
              record.time || "--:--"
            )}
          </span>

          <strong class="report-record-title">
            ${escapeHTML(
              details.title
            )}
          </strong>

        </div>

        ${
          fieldsHTML
            ? `
              <div class="report-fields">
                ${fieldsHTML}
              </div>
            `
            : ""
        }

      </div>

    `;

  }


  /* =======================================================
     HTML DO DIA
  ======================================================= */

  function createDayHTML(
    date,
    records
  ) {

    return `

      <section class="report-day">

        <div class="report-day-header">

          <div class="report-day-icon">
            📅
          </div>

          <div>

            <div class="report-day-date">
              ${escapeHTML(
                formatDateBR(date)
              )}
            </div>

            <div class="report-day-name">
              ${escapeHTML(
                formatLongDate(date)
              )}
            </div>

          </div>

        </div>


        <div class="report-day-records">

          ${records
            .map(
              createRecordHTML
            )
            .join("")}

        </div>

      </section>

    `;

  }


  /* =======================================================
     RESUMO DO RELATÓRIO
  ======================================================= */

  function createSummaryHTML(
    records
  ) {

    const summary =
      calculateSummary(
        records
      );


    const selectedType =
      reportTypeSelect
        ? reportTypeSelect.value
        : "all";


    if (
      selectedType !== "all"
    ) {

      let specificText =
        `${summary.total} registro`;

      if (
        summary.total !== 1
      ) {

        specificText += "s";

      }


      if (
        selectedType === "activity"
      ) {

        specificText +=
          ` · ${summary.activityMinutes} minutos no total`;

      }


      if (
        selectedType === "water"
      ) {

        specificText +=
          ` · ${summary.waterTotal} ml registrados`;

      }


      return `

        <div class="report-summary">

          <div class="report-summary-item">

            <strong>
              ${summary.total}
            </strong>

            <span>
              ${
                summary.total === 1
                  ? "registro"
                  : "registros"
              }
            </span>

          </div>

          <div class="report-summary-text">

            ${escapeHTML(
              specificText
            )}

          </div>

        </div>

      `;

    }


    return `

      <div class="report-summary report-summary-grid">

        <div class="report-summary-item">
          <strong>${summary.meals}</strong>
          <span>Refeições</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.glucose}</strong>
          <span>Glicemias</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.insulin}</strong>
          <span>Insulina</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.activity}</strong>
          <span>Atividades</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.medication}</strong>
          <span>Medicamentos</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.consultation}</strong>
          <span>Consultas</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.waterEntries}</strong>
          <span>Registros de água</span>
        </div>

        <div class="report-summary-item">
          <strong>${summary.waterTotal}</strong>
          <span>ml de água</span>
        </div>

      </div>

    `;

  }


  /* =======================================================
     HTML COMPLETO DO RELATÓRIO
  ======================================================= */

  function createReportHTML(
    records,
    options = {}
  ) {

    const type =
      reportTypeSelect
        ? reportTypeSelect.value
        : "all";


    const definition =
      getTypeDefinition(type);


    const start =
      reportStartDate
        ? reportStartDate.value
        : "";


    const end =
      reportEndDate
        ? reportEndDate.value
        : "";


    const groups =
      groupByDate(records);


    const dates =
      Object.keys(groups)
        .sort();


    let daysHTML = "";


    if (
      dates.length === 0
    ) {

      daysHTML = `

        <div class="report-empty">

          <div class="report-empty-icon">
            📭
          </div>

          <h3>
            Nenhum registro encontrado
          </h3>

          <p>
            Não existem registros deste tipo
            no período selecionado.
          </p>

        </div>

      `;

    } else {

      daysHTML =
        dates
          .map(
            function (date) {

              return createDayHTML(
                date,
                groups[date]
              );

            }
          )
          .join("");

    }


    return `

      <div
        class="report-document"
        data-report-document="true"
      >

        <header class="report-header">

          <div class="report-brand">

            <div class="report-brand-icon">
              🩷
            </div>

            <div>

              <div class="report-brand-name">
                Recordatório + Registros
              </div>

              <div class="report-brand-subtitle">
                Registro pessoal de saúde
              </div>

            </div>

          </div>


          <div class="report-title-block">

            <h1>
              ${escapeHTML(
                definition.title
              )}
            </h1>

            <p>
              Período:
              <strong>
                ${escapeHTML(
                  formatDateBR(start)
                )}
              </strong>
              até
              <strong>
                ${escapeHTML(
                  formatDateBR(end)
                )}
              </strong>
            </p>

          </div>


          <div class="report-generated">

            Gerado em:
            ${escapeHTML(
              formatGeneratedDate()
            )}

          </div>

        </header>


        ${createSummaryHTML(
          records
        )}


        <main class="report-content">

          ${daysHTML}

        </main>


        <footer class="report-footer">

          <div>
            Recordatório + Registros
          </div>

          <div>
            Documento gerado pelo aplicativo
          </div>

        </footer>

      </div>

    `;

  }


  /* =======================================================
     CSS DO RELATÓRIO
  ======================================================= */

  function injectStyles() {

    if (
      document.getElementById(
        "recordatorioReportsStyles"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "recordatorioReportsStyles";


    style.textContent = `

      /* =================================================
         TELA DE RELATÓRIOS
      ================================================= */

      #reportsScreen {
        padding-bottom: 110px;
      }


      .reports-intro {
        margin: 0 0 20px;
        color: #777;
        line-height: 1.55;
      }


      .reports-form {
        display: grid;
        gap: 16px;
      }


      .reports-field {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }


      .reports-field label {
        font-size: 14px;
        font-weight: 700;
        color: #444;
      }


      .reports-field select,
      .reports-field input {
        width: 100%;
        box-sizing: border-box;
        min-height: 46px;
        padding: 11px 13px;
        border: 1px solid #ddd;
        border-radius: 12px;
        background: #fff;
        color: #333;
        font-size: 16px;
      }


      .reports-date-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 12px;
      }


      .reports-count {
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 14px;
        border-radius: 12px;
        background: #fff8f6;
        color: #7f4444;
        font-weight: 700;
        text-align: center;
        box-sizing: border-box;
      }


      .reports-actions {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 4px;
      }


      .reports-status {
        min-height: 22px;
        margin-top: 4px;
        text-align: center;
        color: #777;
        font-size: 14px;
        line-height: 1.45;
      }


      .reports-status.success {
        color: #42724b;
      }


      .reports-status.error {
        color: #a33f3f;
      }


      #reportPreviewContainer {
        margin-top: 20px;
      }


      #reportPreviewContainer[hidden] {
        display: none;
      }


      .report-preview-wrapper {
        overflow-x: auto;
        padding: 2px;
      }


      /* =================================================
         DOCUMENTO
      ================================================= */

      .report-document {
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        box-sizing: border-box;
        background: #fff;
        color: #222;
        font-family:
          Arial,
          Helvetica,
          sans-serif;
      }


      .report-header {
        padding: 26px 24px 20px;
        border-bottom: 2px solid #ead7d7;
      }


      .report-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }


      .report-brand-icon {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #fff1f0;
        font-size: 23px;
      }


      .report-brand-name {
        font-size: 18px;
        font-weight: 800;
        color: #7f4444;
      }


      .report-brand-subtitle {
        margin-top: 3px;
        color: #777;
        font-size: 12px;
      }


      .report-title-block {
        margin-top: 24px;
      }


      .report-title-block h1 {
        margin: 0;
        color: #7f4444;
        font-size: 25px;
        line-height: 1.25;
      }


      .report-title-block p {
        margin: 8px 0 0;
        color: #666;
        font-size: 13px;
      }


      .report-generated {
        margin-top: 12px;
        color: #888;
        font-size: 11px;
      }


      /* =================================================
         RESUMO
      ================================================= */

      .report-summary {
        margin: 20px 24px;
        padding: 15px;
        border: 1px solid #eadede;
        border-radius: 12px;
        background: #fffaf9;
      }


      .report-summary-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0, 1fr));
        gap: 10px;
      }


      .report-summary-item {
        min-width: 0;
        text-align: center;
      }


      .report-summary-item strong {
        display: block;
        color: #7f4444;
        font-size: 19px;
        line-height: 1.2;
      }


      .report-summary-item span {
        display: block;
        margin-top: 3px;
        color: #777;
        font-size: 10px;
      }


      .report-summary-text {
        color: #555;
        font-size: 13px;
        line-height: 1.45;
        text-align: center;
      }


      /* =================================================
         DIAS
      ================================================= */

      .report-content {
        padding: 0 24px;
      }


      .report-day {
        margin-top: 24px;
        page-break-inside: avoid;
        break-inside: avoid;
      }


      .report-day-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 9px;
        border-bottom: 1px solid #eadede;
      }


      .report-day-icon {
        font-size: 19px;
      }


      .report-day-date {
        font-size: 15px;
        font-weight: 800;
        color: #7f4444;
      }


      .report-day-name {
        margin-top: 2px;
        color: #888;
        font-size: 10px;
        text-transform: capitalize;
      }


      .report-day-records {
        margin-top: 8px;
      }


      .report-record {
        padding: 12px 0;
        border-bottom: 1px solid #f0e9e9;
        page-break-inside: avoid;
        break-inside: avoid;
      }


      .report-record-header {
        display: flex;
        align-items: baseline;
        gap: 9px;
      }


      .report-record-time {
        flex: 0 0 auto;
        min-width: 40px;
        color: #7f4444;
        font-size: 12px;
        font-weight: 800;
      }


      .report-record-title {
        color: #333;
        font-size: 13px;
      }


      .report-fields {
        margin: 7px 0 0 49px;
      }


      .report-field {
        display: flex;
        gap: 6px;
        margin-top: 4px;
        line-height: 1.4;
      }


      .report-field-label {
        flex: 0 0 auto;
        color: #777;
        font-size: 11px;
        font-weight: 700;
      }


      .report-field-value {
        color: #444;
        font-size: 11px;
        white-space: pre-wrap;
      }


      /* =================================================
         VAZIO
      ================================================= */

      .report-empty {
        margin: 28px 0;
        padding: 30px 20px;
        border: 1px dashed #ddd;
        border-radius: 14px;
        text-align: center;
      }


      .report-empty-icon {
        font-size: 35px;
      }


      .report-empty h3 {
        margin: 10px 0 6px;
        color: #555;
        font-size: 17px;
      }


      .report-empty p {
        margin: 0;
        color: #888;
        font-size: 13px;
      }


      /* =================================================
         RODAPÉ
      ================================================= */

      .report-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 30px;
        padding: 15px 24px 20px;
        border-top: 1px solid #eadede;
        color: #999;
        font-size: 9px;
      }


      /* =================================================
         IMPRESSÃO / PDF
      ================================================= */

      .report-pdf-mode {
        width: 794px !important;
        max-width: 794px !important;
        background: #fff !important;
      }


      .report-pdf-mode .report-header {
        padding-top: 24px;
      }


      /* =================================================
         RESPONSIVO
      ================================================= */

      @media (max-width: 650px) {

        .reports-date-grid {
          grid-template-columns: 1fr;
        }


        .reports-actions {
          grid-template-columns: 1fr;
        }


        .report-summary-grid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }


        .report-header {
          padding: 20px 16px 16px;
        }


        .report-summary {
          margin-left: 16px;
          margin-right: 16px;
        }


        .report-content {
          padding-left: 16px;
          padding-right: 16px;
        }


        .report-footer {
          padding-left: 16px;
          padding-right: 16px;
        }


        .report-record-header {
          align-items: flex-start;
        }


        .report-fields {
          margin-left: 0;
        }

      }


      @media print {

        .report-document {
          max-width: none;
        }


        .report-day,
        .report-record {
          page-break-inside: avoid;
          break-inside: avoid;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =======================================================
     CRIAR TELA
  ======================================================= */

  function createReportScreen() {

    if (
      document.getElementById(
        "reportsScreen"
      )
    ) {

      reportScreen =
        document.getElementById(
          "reportsScreen"
        );

      cacheElements();

      return;

    }


    const appContent =
      document.getElementById(
        "appContent"
      );


    if (!appContent) {

      console.error(
        "appContent não encontrado."
      );

      return;

    }


    reportScreen =
      document.createElement(
        "section"
      );


    reportScreen.id =
      "reportsScreen";

    reportScreen.className =
      "app-screen";

    reportScreen.hidden =
      true;


    reportScreen.innerHTML = `

      <header class="topbar">

        <div>

          <p class="eyebrow">
            RECORDATÓRIO + REGISTROS
          </p>

          <h1>
            Relatórios
          </h1>

        </div>

      </header>


      <main>

        <section class="card">

          <h2>
            📄 Gerar relatório
          </h2>


          <p class="reports-intro">

            Escolha o tipo de registro e o período
            que deseja incluir no relatório para
            compartilhar com sua médica.

          </p>


          <div class="reports-form">


            <div class="reports-field">

              <label
                for="reportTypeSelect"
              >
                Tipo de relatório
              </label>


              <select
                id="reportTypeSelect"
              >

                <option value="meal">
                  🍽️ Recordatório alimentar
                </option>

                <option value="glucose">
                  🩸 Glicemias
                </option>

                <option value="insulin">
                  💉 Insulina
                </option>

                <option value="activity">
                  🏋️ Atividades físicas
                </option>

                <option value="medication">
                  💊 Medicamentos / suplementos / vitaminas
                </option>

                <option value="consultation">
                  🩺 Consultas
                </option>

                <option value="water">
                  💧 Água
                </option>

                <option value="all">
                  📋 Todos os registros
                </option>

              </select>

            </div>


            <div>

              <label
                style="
                  display:block;
                  margin-bottom:7px;
                  font-size:14px;
                  font-weight:700;
                  color:#444;
                "
              >
                Período
              </label>


              <div class="reports-date-grid">


                <div class="reports-field">

                  <label
                    for="reportStartDate"
                  >
                    Data inicial
                  </label>

                  <input
                    id="reportStartDate"
                    type="date"
                  >

                </div>


                <div class="reports-field">

                  <label
                    for="reportEndDate"
                  >
                    Data final
                  </label>

                  <input
                    id="reportEndDate"
                    type="date"
                  >

                </div>


              </div>

            </div>


            <div
              id="reportCount"
              class="reports-count"
            >
              Selecione o período para consultar
              os registros.
            </div>


            <div class="reports-actions">


              <button
                type="button"
                id="reportPreviewButton"
                class="secondary-button"
              >
                👁️ Visualizar relatório
              </button>


              <button
                type="button"
                id="reportGenerateButton"
                class="primary-button"
              >
                📄 Baixar PDF
              </button>


            </div>


            <div
              id="reportStatus"
              class="reports-status"
              aria-live="polite"
            ></div>


          </div>

        </section>


        <section
          id="reportPreviewContainer"
          class="card"
          hidden
        >

          <div class="section-header">

            <h2>
              Visualização
            </h2>

          </div>


          <div
            id="reportPreview"
            class="report-preview-wrapper"
          ></div>

        </section>

      </main>

    `;


    const moreScreen =
      document.getElementById(
        "moreScreen"
      );


    if (moreScreen) {

      appContent.insertBefore(
        reportScreen,
        moreScreen
      );

    } else {

      appContent.appendChild(
        reportScreen
      );

    }


    cacheElements();

  }


  /* =======================================================
     CACHE DOS ELEMENTOS
  ======================================================= */

  function cacheElements() {

    reportScreen =
      document.getElementById(
        "reportsScreen"
      );


    reportTypeSelect =
      document.getElementById(
        "reportTypeSelect"
      );


    reportStartDate =
      document.getElementById(
        "reportStartDate"
      );


    reportEndDate =
      document.getElementById(
        "reportEndDate"
      );


    reportCount =
      document.getElementById(
        "reportCount"
      );


    reportPreview =
      document.getElementById(
        "reportPreview"
      );


    reportGenerateButton =
      document.getElementById(
        "reportGenerateButton"
      );


    reportPreviewButton =
      document.getElementById(
        "reportPreviewButton"
      );


    reportStatus =
      document.getElementById(
        "reportStatus"
      );

  }


  /* =======================================================
     DATAS PADRÃO
  ======================================================= */

  function setDefaultDates() {

    const today =
      todayKey();


    if (
      reportStartDate &&
      !reportStartDate.value
    ) {

      reportStartDate.value =
        today;

    }


    if (
      reportEndDate &&
      !reportEndDate.value
    ) {

      reportEndDate.value =
        today;

    }

  }


  /* =======================================================
     ATUALIZAR CONTADOR
  ======================================================= */

  function updateCount() {

    if (!reportCount) {
      return;
    }


    const validation =
      validatePeriod();


    if (!validation.valid) {

      reportCount.textContent =
        validation.message;

      return;

    }


    const records =
      getFilteredRecords();


    const total =
      records.length;


    const type =
      reportTypeSelect
        ? reportTypeSelect.value
        : "all";


    const definition =
      getTypeDefinition(type);


    if (total === 0) {

      reportCount.textContent =
        `Nenhum registro encontrado para ${definition.title.toLowerCase()} no período selecionado.`;

      return;

    }


    reportCount.textContent =
      `${total} ${
        total === 1
          ? "registro encontrado"
          : "registros encontrados"
      } para ${definition.title.toLowerCase()}.`;

  }


  /* =======================================================
     STATUS
  ======================================================= */

  function setStatus(
    message,
    type = ""
  ) {

    if (!reportStatus) {
      return;
    }


    reportStatus.textContent =
      message;


    reportStatus.className =
      "reports-status" +
      (
        type
          ? ` ${type}`
          : ""
      );

  }


  /* =======================================================
     VISUALIZAR
  ======================================================= */

  function previewReport() {

    const validation =
      validatePeriod();


    if (!validation.valid) {

      setStatus(
        validation.message,
        "error"
      );

      return false;

    }


    const records =
      getFilteredRecords();


    if (!reportPreview) {

      return false;

    }


    reportPreview.innerHTML =
      createReportHTML(
        records
      );


    const container =
      document.getElementById(
        "reportPreviewContainer"
      );


    if (container) {

      container.hidden =
        false;

    }


    setStatus(
      records.length
        ? "Visualização atualizada."
        : "Não há registros no período selecionado.",
      records.length
        ? "success"
        : ""
    );


    return true;

  }


  /* =======================================================
     GERAR PDF
  ======================================================= */

  async function generatePDF() {

    const validation =
      validatePeriod();


    if (!validation.valid) {

      setStatus(
        validation.message,
        "error"
      );

      return;

    }


    const records =
      getFilteredRecords();


    if (
      records.length === 0
    ) {

      const proceed =
        confirm(
          "Não existem registros no período selecionado. Deseja gerar mesmo assim um PDF vazio?"
        );


      if (!proceed) {

        return;

      }

    }


    if (!previewReport()) {

      return;

    }


    setStatus(
      "Preparando PDF..."
    );


    if (reportGenerateButton) {

      reportGenerateButton.disabled =
        true;

    }


    if (reportPreviewButton) {

      reportPreviewButton.disabled =
        true;

    }


    try {

      const html2pdf =
        await loadPdfLibrary();


      const documentElement =
        reportPreview
          ? reportPreview.querySelector(
              "[data-report-document='true']"
            )
          : null;


      if (!documentElement) {

        throw new Error(
          "Não foi possível preparar o documento do relatório."
        );

      }


      documentElement.classList.add(
        "report-pdf-mode"
      );


      const type =
        reportTypeSelect
          ? reportTypeSelect.value
          : "all";


      const definition =
        getTypeDefinition(type);


      const fileType =
        sanitizeFileName(
          definition.title
        );


      const fileName =
        `${fileType}_${validation.start}_a_${validation.end}.pdf`;


      const options = {

        margin: [
          10,
          10,
          12,
          10
        ],

        filename:
          fileName,

        image: {
          type: "jpeg",
          quality: 0.98
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false
        },

        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        },

        pagebreak: {
          mode: [
            "css",
            "legacy"
          ],
          avoid: [
            ".report-day",
            ".report-record"
          ]
        }

      };


      await html2pdf()
        .set(options)
        .from(documentElement)
        .save();


      setStatus(
        "PDF gerado com sucesso.",
        "success"
      );


    } catch (error) {

      console.error(
        "Erro ao gerar relatório PDF:",
        error
      );


      setStatus(
        "Não foi possível gerar o PDF. Verifique sua conexão com a internet e tente novamente.",
        "error"
      );


    } finally {

      const documentElement =
        reportPreview
          ? reportPreview.querySelector(
              "[data-report-document='true']"
            )
          : null;


      if (documentElement) {

        documentElement.classList.remove(
          "report-pdf-mode"
        );

      }


      if (reportGenerateButton) {

        reportGenerateButton.disabled =
          false;

      }


      if (reportPreviewButton) {

        reportPreviewButton.disabled =
          false;

      }

    }

  }


  /* =======================================================
     ABRIR TELA
  ======================================================= */

  function openReportsScreen() {

    if (!reportScreen) {

      createReportScreen();

    }


    cacheElements();

    setDefaultDates();

    updateCount();

    setStatus("");


    if (
      typeof window.showScreen ===
      "function"
    ) {

      window.showScreen(
        "reportsScreen"
      );

    } else {

      const screens =
        document.querySelectorAll(
          ".app-screen"
        );


      screens.forEach(
        function (screen) {

          screen.hidden =
            screen.id !==
            "reportsScreen";

        }
      );


      const navigationItems =
        document.querySelectorAll(
          ".navigation-item"
        );


      navigationItems.forEach(
        function (item) {

          item.classList.remove(
            "active"
          );

        }
      );

    }

  }


  /* =======================================================
     ADICIONAR BOTÃO EM "MAIS"
  ======================================================= */

  function ensureReportsButton() {

    const moreScreen =
      document.getElementById(
        "moreScreen"
      );


    if (!moreScreen) {

      return;

    }


    if (
      document.getElementById(
        "reportsButton"
      )
    ) {

      return;

    }


    const optionsCard =
      moreScreen.querySelector(
        ".card"
      );


    if (!optionsCard) {

      return;

    }


    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";

    button.id =
      "reportsButton";

    button.className =
      "quick-button";


    button.innerHTML = `
      📄 Relatórios
    `;


    button.addEventListener(
      "click",
      openReportsScreen
    );


    const settingsButton =
      document.getElementById(
        "settingsButton"
      );


    if (settingsButton) {

      settingsButton.insertAdjacentElement(
        "beforebegin",
        button
      );

    } else {

      optionsCard.appendChild(
        button
      );

    }

  }


  /* =======================================================
     ADICIONAR TELA AO SISTEMA DE NAVEGAÇÃO
  ======================================================= */

  function ensureNavigationSupport() {

    /*
     * A tela de relatório não precisa
     * aparecer na barra inferior.
     *
     * Ela é acessada pelo menu "Mais".
     *
     * Quando o usuário abrir o relatório,
     * showScreen() já consegue esconder
     * as outras telas porque todas possuem
     * a classe .app-screen.
     */

  }


  /* =======================================================
     EVENTOS
  ======================================================= */

  function attachEvents() {

    if (
      reportTypeSelect
    ) {

      reportTypeSelect.addEventListener(
        "change",
        function () {

          updateCount();

          if (
            reportPreview &&
            reportPreview.innerHTML.trim()
          ) {

            previewReport();

          }

        }
      );

    }


    if (
      reportStartDate
    ) {

      reportStartDate.addEventListener(
        "change",
        function () {

          updateCount();

        }
      );

    }


    if (
      reportEndDate
    ) {

      reportEndDate.addEventListener(
        "change",
        function () {

          updateCount();

        }
      );

    }


    if (
      reportPreviewButton
    ) {

      reportPreviewButton.addEventListener(
        "click",
        previewReport
      );

    }


    if (
      reportGenerateButton
    ) {

      reportGenerateButton.addEventListener(
        "click",
        generatePDF
      );

    }

  }


  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  function initializeReports() {

    injectStyles();

    createReportScreen();

    ensureReportsButton();

    ensureNavigationSupport();

    setDefaultDates();

    attachEvents();

    updateCount();

  }


  /* =======================================================
     OBSERVAR APP
  ======================================================= */

  function waitForApp() {

    if (
      document.getElementById(
        "appContent"
      ) &&
      document.getElementById(
        "moreScreen"
      )
    ) {

      initializeReports();

      return;

    }


    setTimeout(
      waitForApp,
      250
    );

  }


  /* =======================================================
     EXPOR API
  ======================================================= */

  window.RecordatorioReports = {

    open:
      openReportsScreen,

    refresh:
      updateCount,

    preview:
      previewReport,

    generatePDF:
      generatePDF

  };


  /* =======================================================
     START
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      waitForApp
    );

  } else {

    waitForApp();

  }


})();
