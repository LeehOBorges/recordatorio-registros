/* =========================================================
   RECORDATÓRIO + REGISTROS
   VERSÃO 0.1 — CÓDIGO COMPLETO
   REFEIÇÕES / GLICEMIA / INSULINA / ATIVIDADE
   MEDICAMENTOS / SUPLEMENTOS / VITAMINAS
   CONSULTAS
   BACKUP E RESTAURAÇÃO
========================================================= */

const STORAGE_KEY = "recordatorio_registros_v01";
const GLUCOSE_SETTINGS_KEY = "recordatorio_glicemia_config_v01";
const MEDICATION_SETTINGS_KEY = "recordatorio_medicamentos_config_v01";


/* =========================================================
   CONFIGURAÇÃO PADRÃO DAS GLICEMIAS
========================================================= */

const defaultGlucoseOptions = {
  fasting: true,
  breakfast1: true,
  breakfast2: true,
  morningSnack1: true,
  morningSnack2: true,
  lunch1: true,
  lunch2: true,
  afternoonSnack1: true,
  afternoonSnack2: true,
  dinner1: true,
  dinner2: true,
  supper1: true,
  supper2: true
};


/* =========================================================
   ESTADO
========================================================= */

let database = loadDatabase();
let glucoseSettings = loadGlucoseSettings();
let medications = loadMedications();
let selectedDate = new Date();
let editingId = null;
let currentRecordType = null;


/* =========================================================
   BANCO DE DADOS
========================================================= */

function loadDatabase() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return {
        records: [],
        trash: []
      };
    }

    const parsed = JSON.parse(stored);

    return {
      records: Array.isArray(parsed.records)
        ? parsed.records
        : [],

      trash: Array.isArray(parsed.trash)
        ? parsed.trash
        : []
    };

  } catch (error) {

    console.error(
      "Erro ao carregar banco:",
      error
    );

    return {
      records: [],
      trash: []
    };
  }
}


function saveDatabase() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(database)
  );
}


/* =========================================================
   CONFIGURAÇÃO DE GLICEMIA
========================================================= */

function loadGlucoseSettings() {
  try {

    const stored =
      localStorage.getItem(
        GLUCOSE_SETTINGS_KEY
      );

    if (!stored) {
      return {
        ...defaultGlucoseOptions
      };
    }

    const parsed =
      JSON.parse(stored);

    return {
      ...defaultGlucoseOptions,
      ...(parsed &&
      typeof parsed === "object"
        ? parsed
        : {})
    };

  } catch (error) {

    console.error(
      "Erro ao carregar configurações de glicemia:",
      error
    );

    return {
      ...defaultGlucoseOptions
    };
  }
}


function saveGlucoseSettings() {
  localStorage.setItem(
    GLUCOSE_SETTINGS_KEY,
    JSON.stringify(glucoseSettings)
  );
}


/* =========================================================
   MEDICAMENTOS / SUPLEMENTOS / VITAMINAS
========================================================= */

function loadMedications() {

  try {

    const stored =
      localStorage.getItem(
        MEDICATION_SETTINGS_KEY
      );

    if (!stored) return [];

    const parsed =
      JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      "Erro ao carregar medicamentos:",
      error
    );

    return [];
  }
}


function saveMedications() {

  localStorage.setItem(
    MEDICATION_SETTINGS_KEY,
    JSON.stringify(medications)
  );
}


function generateMedicationId() {

  return (
    "med_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .substring(2)
  );
}


/* =========================================================
   ELEMENTOS
========================================================= */

const modal =
  document.getElementById(
    "recordModal"
  );

const form =
  document.getElementById(
    "recordForm"
  );

const formFields =
  document.getElementById(
    "formFields"
  );

const modalTitle =
  document.getElementById(
    "modalTitle"
  );


/* =========================================================
   ID
========================================================= */

function generateId() {

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2)
  );
}


/* =========================================================
   DATAS E HORÁRIOS
========================================================= */

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

  return `${year}-${month}-${day}`;
}


function formatDisplayDate(date) {

  return date.toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long"
    }
  );
}


function currentTime() {

  const now =
    new Date();

  return (
    String(
      now.getHours()
    ).padStart(2, "0") +

    ":" +

    String(
      now.getMinutes()
    ).padStart(2, "0")
  );
}


/* =========================================================
   SEGURANÇA
========================================================= */

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


/* =========================================================
   DATA NO CABEÇALHO
========================================================= */

function renderDate() {

  const element =
    document.getElementById(
      "currentDate"
    );

  if (!element) return;

  element.textContent =
    formatDisplayDate(
      selectedDate
    );
}


/* =========================================================
   REGISTROS DO DIA
========================================================= */

function getTodayRecords() {

  const dateKey =
    formatDateKey(
      selectedDate
    );

  return database.records
    .filter(
      record =>
        record.date === dateKey
    )
    .sort(
      (a, b) =>
        String(
          a.time || ""
        ).localeCompare(
          String(
            b.time || ""
          )
        )
    );
}


/* =========================================================
   NAVEGAR ENTRE TELAS
========================================================= */

function showScreen(
  targetScreen
) {

  if (!targetScreen) return;

  const screens =
    document.querySelectorAll(
      ".app-screen"
    );

  screens.forEach(
    screen => {

      screen.hidden =
        screen.id !==
        targetScreen;
    }
  );

  const navigationItems =
    document.querySelectorAll(
      ".navigation-item"
    );

  navigationItems.forEach(
    item => {

      item.classList.toggle(
        "active",
        item.dataset.screen ===
        targetScreen
      );
    }
  );

  if (
    targetScreen ===
    "diaryScreen"
  ) {
    renderDiary();
  }

  if (
    targetScreen ===
    "consultationScreen"
  ) {
    renderConsultations();
  }

  if (
    targetScreen ===
    "moreScreen"
  ) {
    renderMoreScreen();
  }
}


/* =========================================================
   ABRIR TELA DE CONSULTAS
========================================================= */

function openConsultationsScreen() {

  showScreen(
    "consultationScreen"
  );

  renderConsultations();
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  renderDate();

  const records =
    getTodayRecords();

  const meals =
    records.filter(
      record =>
        record.type === "meal"
    );

  const glucose =
    records.filter(
      record =>
        record.type === "glucose"
    );

  const insulin =
    records.filter(
      record =>
        record.type === "insulin"
    );

  const activities =
    records.filter(
      record =>
        record.type === "activity"
    );

  const mealCount =
    document.getElementById(
      "mealCount"
    );

  if (mealCount) {
    mealCount.textContent =
      meals.length;
  }

  const glucoseCount =
    document.getElementById(
      "glucoseCount"
    );

  if (glucoseCount) {
    glucoseCount.textContent =
      glucose.length;
  }

  const insulinCount =
    document.getElementById(
      "insulinCount"
    );

  if (insulinCount) {
    insulinCount.textContent =
      insulin.length;
  }

  const totalMinutes =
    activities.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.duration || 0
        ),
      0
    );

  const activityTotal =
    document.getElementById(
      "activityTotal"
    );

  if (activityTotal) {
    activityTotal.textContent =
      `${totalMinutes} min`;
  }

  renderTimeline(
    records
  );

  renderMedicationHome();
}


/* =========================================================
   LINHA DO TEMPO
========================================================= */

function renderTimeline(
  records
) {

  const timeline =
    document.getElementById(
      "timeline"
    );

  if (!timeline) return;

  if (records.length === 0) {

    timeline.innerHTML = `
      <div class="empty-state">
        Nenhum registro neste dia.
        <br><br>
        Use os botões acima para começar.
      </div>
    `;

    return;
  }

  timeline.innerHTML =
    records
      .map(
        createTimelineItem
      )
      .join("");
}


/* =========================================================
   ITEM DA LINHA DO TEMPO
========================================================= */

function createTimelineItem(
  record
) {

  const icons = {
    meal: "🍽️",
    glucose: "🩸",
    insulin: "💉",
    activity: "🏋️",
    medication: "💊",
    consultation: "🩺"
  };

  let title = "";
  let detail = "";

  if (
    record.type ===
    "meal"
  ) {

    title =
      record.mealType ||
      "Refeição";

    detail =
      record.food ||
      "Refeição registrada";

    if (record.quantity) {
      detail +=
        ` · ${record.quantity}`;
    }

  } else if (
    record.type ===
    "glucose"
  ) {

    title =
      `${record.value} mg/dL`;

    detail =
      record.kind ||
      "Glicemia";

  } else if (
    record.type ===
    "insulin"
  ) {

    title =
      `${record.dose} U`;

    detail =
      record.insulin ||
      "Insulina";

    if (record.application) {
      detail +=
        ` · ${record.application}`;
    }

  } else if (
    record.type ===
    "activity"
  ) {

    title =
      record.activity ||
      "Atividade";

    detail =
      `${record.duration || 0} min`;

    if (record.intensity) {
      detail +=
        ` · ${record.intensity}`;
    }

  } else if (
    record.type ===
    "medication"
  ) {

    title =
      record.medicationName ||
      "Medicamento / suplemento / vitamina";

    detail =
      "Tomado";

    if (record.period) {

      const periodLabels = {
        morning: "Manhã",
        afternoon: "Tarde",
        night: "Noite"
      };

      detail +=
        ` · ${
          periodLabels[
            record.period
          ] ||
          record.period
        }`;
    }

  } else if (
    record.type ===
    "consultation"
  ) {

    title =
      record.specialty ||
      "Consulta";

    detail =
      record.professional ||
      "Consulta médica";

    if (record.location) {
      detail +=
        ` · ${record.location}`;
    }
  }

  return `
    <div class="timeline-item">

      <div class="timeline-icon">
        ${icons[record.type] || "📝"}
      </div>

      <div class="timeline-content">

        <div class="timeline-title">
          ${escapeHTML(record.time)}
          ·
          ${escapeHTML(title)}
        </div>

        <div class="timeline-detail">
          ${escapeHTML(detail)}
        </div>

      </div>

      <div class="timeline-actions">

        <button
          type="button"
          onclick="editRecord('${escapeHTML(record.id)}')"
          title="Editar"
        >
          ✏️
        </button>

        <button
          type="button"
          onclick="deleteRecord('${escapeHTML(record.id)}')"
          title="Excluir"
        >
          🗑️
        </button>

      </div>

    </div>
  `;
}


/* =========================================================
   OPÇÕES DE GLICEMIA
========================================================= */

function getGlucoseOptions(
  record = null
) {

  const definitions = [

    [
      "fasting",
      "Jejum"
    ],

    [
      "breakfast1",
      "1h após o café da manhã"
    ],

    [
      "breakfast2",
      "2h após o café da manhã"
    ],

    [
      "morningSnack1",
      "1h após o lanche da manhã"
    ],

    [
      "morningSnack2",
      "2h após o lanche da manhã"
    ],

    [
      "lunch1",
      "1h após o almoço"
    ],

    [
      "lunch2",
      "2h após o almoço"
    ],

    [
      "afternoonSnack1",
      "1h após o lanche da tarde"
    ],

    [
      "afternoonSnack2",
      "2h após o lanche da tarde"
    ],

    [
      "dinner1",
      "1h após o jantar"
    ],

    [
      "dinner2",
      "2h após o jantar"
    ],

    [
      "supper1",
      "1h após a ceia"
    ],

    [
      "supper2",
      "2h após a ceia"
    ]

  ];

  const options =
    definitions

      .filter(
        item =>
          glucoseSettings[
            item[0]
          ]
      )

      .map(
        item => ({
          value: item[1],
          label: item[1]
        })
      );

  if (
    record &&
    record.kind &&
    !options.some(
      option =>
        option.value ===
        record.kind
    )
  ) {

    options.unshift({
      value:
        record.kind,

      label:
        record.kind
    });
  }

  return options;
}


/* =========================================================
   ABRIR FORMULÁRIO
========================================================= */

function openRecordForm(
  type,
  record = null
) {

  currentRecordType =
    type;

  editingId =
    record
      ? record.id
      : null;

  const titles = {

    meal:
      record
        ? "Editar refeição"
        : "Nova refeição",

    glucose:
      record
        ? "Editar glicemia"
        : "Nova glicemia",

    insulin:
      record
        ? "Editar insulina"
        : "Nova aplicação",

    activity:
      record
        ? "Editar atividade"
        : "Nova atividade",

    consultation:
      record
        ? "Editar consulta"
        : "Nova consulta"
  };

  if (modalTitle) {
    modalTitle.textContent =
      titles[type];
  }

  const date =
    record
      ? record.date
      : formatDateKey(
          selectedDate
        );

  const time =
    record
      ? record.time
      : currentTime();

  let html = `

    <div class="form-group">

      <label for="recordDate">
        Data
      </label>

      <input
        id="recordDate"
        type="date"
        value="${escapeHTML(date)}"
        required
      >

    </div>

    <div class="form-group">

      <label for="recordTime">
        Horário
      </label>

      <input
        id="recordTime"
        type="time"
        value="${escapeHTML(time)}"
        required
      >

    </div>

  `;


  if (
    type ===
    "meal"
  ) {

    html += `

      <div class="form-group">

        <label for="mealType">
          Tipo de refeição
        </label>

        <select id="mealType">

          <option>
            Café da manhã
          </option>

          <option>
            Lanche da manhã
          </option>

          <option>
            Almoço
          </option>

          <option>
            Lanche da tarde
          </option>

          <option>
            Jantar
          </option>

          <option>
            Ceia
          </option>

          <option>
            Outra
          </option>

        </select>

      </div>


      <div class="form-group">

        <label for="food">
          Alimentos consumidos
        </label>

        <input
          id="food"
          type="text"
          placeholder="Ex.: arroz, feijão, frango e salada"
        >

      </div>


      <div class="form-group">

        <label for="quantity">
          Quantidade
        </label>

        <input
          id="quantity"
          type="text"
          placeholder="Ex.: 100 g, 2 unidades"
        >

      </div>


      <div class="form-group">

        <label for="note">
          Observação
        </label>

        <textarea
          id="note"
          placeholder="Opcional"
        ></textarea>

      </div>

    `;
  }


  if (
    type ===
    "glucose"
  ) {

    const options =
      getGlucoseOptions(
        record
      );

    const optionsHTML =
      options

        .map(
          option => `

            <option
              value="${escapeHTML(option.value)}"
              ${
                record &&
                record.kind ===
                  option.value
                  ? "selected"
                  : ""
              }
            >
              ${escapeHTML(option.label)}
            </option>

          `
        )

        .join("");


    html += `

      <div class="form-group">

        <label for="glucoseValue">
          Glicemia (mg/dL)
        </label>

        <input
          id="glucoseValue"
          type="number"
          min="0"
          step="1"
          required
        >

      </div>


      <div class="form-group">

        <label for="glucoseKind">
          Momento da medição
        </label>

        <select id="glucoseKind">
          ${optionsHTML}
        </select>

      </div>


      <div class="form-group">

        <label for="glucoseNote">
          Observação
        </label>

        <textarea
          id="glucoseNote"
          placeholder="Opcional"
        ></textarea>

      </div>

    `;
  }


  if (
    type ===
    "insulin"
  ) {

    html += `

      <div class="form-group">

        <label for="insulinName">
          Insulina
        </label>

        <input
          id="insulinName"
          type="text"
          value="Novolin N"
        >

      </div>


      <div class="form-group">

        <label for="insulinDose">
          Dose (unidades)
        </label>

        <input
          id="insulinDose"
          type="number"
          min="0"
          step="1"
          required
        >

      </div>


      <div class="form-group">

        <label for="application">
          Aplicação
        </label>

        <select id="application">

          <option>
            Em jejum
          </option>

          <option>
            Antes do almoço
          </option>

          <option>
            À noite
          </option>

          <option>
            Outra
          </option>

        </select>

      </div>


      <div class="form-group">

        <label for="insulinNote">
          Observação
        </label>

        <textarea
          id="insulinNote"
          placeholder="Opcional"
        ></textarea>

      </div>

    `;
  }


  if (
    type ===
    "activity"
  ) {

    html += `

      <div class="form-group">

        <label for="activityType">
          Atividade
        </label>

        <select id="activityType">

          <option>
            Musculação
          </option>

          <option>
            Caminhada
          </option>

          <option>
            Corrida
          </option>

          <option>
            Bicicleta
          </option>

          <option>
            Alongamento
          </option>

          <option>
            Outra
          </option>

        </select>

      </div>


      <div class="form-group">

        <label for="duration">
          Duração (minutos)
        </label>

        <input
          id="duration"
          type="number"
          min="0"
          required
        >

      </div>


      <div class="form-group">

        <label for="intensity">
          Intensidade
        </label>

        <select id="intensity">

          <option>
            Leve
          </option>

          <option>
            Moderada
          </option>

          <option>
            Intensa
          </option>

        </select>

      </div>


      <div class="form-group">

        <label for="activityNote">
          Observação
        </label>

        <textarea
          id="activityNote"
          placeholder="Opcional"
        ></textarea>

      </div>

    `;
  }


  if (
    type ===
    "consultation"
  ) {

    html += `

      <div class="form-group">

        <label for="consultationProfessional">
          Profissional
        </label>

        <input
          id="consultationProfessional"
          type="text"
          placeholder="Ex.: Dra. Maria Silva"
          required
        >

      </div>


      <div class="form-group">

        <label for="consultationSpecialty">
          Especialidade
        </label>

        <input
          id="consultationSpecialty"
          type="text"
          placeholder="Ex.: Obstetra"
          required
        >

      </div>


      <div class="form-group">

        <label for="consultationLocation">
          Local
        </label>

        <input
          id="consultationLocation"
          type="text"
          placeholder="Ex.: Clínica / consultório / hospital"
        >

      </div>


      <div class="form-group">

        <label for="consultationReason">
          Motivo da consulta
        </label>

        <input
          id="consultationReason"
          type="text"
          placeholder="Ex.: Consulta de acompanhamento"
        >

      </div>


      <div class="form-group">

        <label for="consultationNote">
          Observações
        </label>

        <textarea
          id="consultationNote"
          placeholder="Anote informações importantes, orientações, pedidos de exames etc."
        ></textarea>

      </div>

    `;
  }


  if (formFields) {
    formFields.innerHTML =
      html;
  }

  if (record) {
    fillEditFields(
      record
    );
  }

  if (modal) {
    modal.showModal();
  }
}


/* =========================================================
   PREENCHER EDIÇÃO
========================================================= */

function fillEditFields(
  record
) {

  const setValue =
    (
      id,
      value
    ) => {

      const element =
        document.getElementById(
          id
        );

      if (element) {
        element.value =
          value ?? "";
      }
    };


  setValue(
    "recordDate",
    record.date
  );

  setValue(
    "recordTime",
    record.time
  );


  setValue(
    "mealType",
    record.mealType
  );

  setValue(
    "food",
    record.food
  );

  setValue(
    "quantity",
    record.quantity
  );

  setValue(
    "note",
    record.note
  );


  setValue(
    "glucoseValue",
    record.value
  );

  setValue(
    "glucoseKind",
    record.kind
  );

  setValue(
    "glucoseNote",
    record.note
  );


  setValue(
    "insulinName",
    record.insulin
  );

  setValue(
    "insulinDose",
    record.dose
  );

  setValue(
    "application",
    record.application
  );

  setValue(
    "insulinNote",
    record.note
  );


  setValue(
    "activityType",
    record.activity
  );

  setValue(
    "duration",
    record.duration
  );

  setValue(
    "intensity",
    record.intensity
  );

  setValue(
    "activityNote",
    record.note
  );


  setValue(
    "consultationProfessional",
    record.professional
  );

  setValue(
    "consultationSpecialty",
    record.specialty
  );

  setValue(
    "consultationLocation",
    record.location
  );

  setValue(
    "consultationReason",
    record.reason
  );

  setValue(
    "consultationNote",
    record.note
  );
}


/* =========================================================
   SALVAR REGISTRO
========================================================= */

if (form) {

  form.addEventListener(
    "submit",
    function(event) {

      event.preventDefault();

      const dateElement =
        document.getElementById(
          "recordDate"
        );

      const timeElement =
        document.getElementById(
          "recordTime"
        );

      if (
        !dateElement ||
        !timeElement
      ) {
        return;
      }


      const record = {

        id:
          editingId ||
          generateId(),

        type:
          currentRecordType,

        date:
          dateElement.value,

        time:
          timeElement.value,

        updatedAt:
          new Date()
            .toISOString()
      };


      if (
        currentRecordType ===
        "meal"
      ) {

        record.mealType =
          document.getElementById(
            "mealType"
          ).value;

        record.food =
          document.getElementById(
            "food"
          ).value.trim();

        record.quantity =
          document.getElementById(
            "quantity"
          ).value.trim();

        record.note =
          document.getElementById(
            "note"
          ).value.trim();
      }


      if (
        currentRecordType ===
        "glucose"
      ) {

        record.value =
          document.getElementById(
            "glucoseValue"
          ).value;

        record.kind =
          document.getElementById(
            "glucoseKind"
          ).value;

        record.note =
          document.getElementById(
            "glucoseNote"
          ).value.trim();
      }


      if (
        currentRecordType ===
        "insulin"
      ) {

        record.insulin =
          document.getElementById(
            "insulinName"
          ).value.trim();

        record.dose =
          document.getElementById(
            "insulinDose"
          ).value;

        record.application =
          document.getElementById(
            "application"
          ).value;

        record.note =
          document.getElementById(
            "insulinNote"
          ).value.trim();
      }


      if (
        currentRecordType ===
        "activity"
      ) {

        record.activity =
          document.getElementById(
            "activityType"
          ).value;

        record.duration =
          document.getElementById(
            "duration"
          ).value;

        record.intensity =
          document.getElementById(
            "intensity"
          ).value;

        record.note =
          document.getElementById(
            "activityNote"
          ).value.trim();
      }


      if (
        currentRecordType ===
        "consultation"
      ) {

        record.professional =
          document.getElementById(
            "consultationProfessional"
          ).value.trim();

        record.specialty =
          document.getElementById(
            "consultationSpecialty"
          ).value.trim();

        record.location =
          document.getElementById(
            "consultationLocation"
          ).value.trim();

        record.reason =
          document.getElementById(
            "consultationReason"
          ).value.trim();

        record.note =
          document.getElementById(
            "consultationNote"
          ).value.trim();
      }


      if (editingId) {

        const index =
          database.records.findIndex(
            item =>
              item.id ===
              editingId
          );

        if (index !== -1) {

          database.records[index] =
            {
              ...database.records[index],
              ...record
            };
        }

      } else {

        record.createdAt =
          new Date()
            .toISOString();

        database.records.push(
          record
        );
      }


      saveDatabase();


      if (modal) {
        modal.close();
      }


      editingId =
        null;

      currentRecordType =
        null;


      renderDashboard();

      renderDiary();

      renderConsultations();
    }
  );
}


/* =========================================================
   EDITAR REGISTRO
========================================================= */

function editRecord(
  id
) {

  const record =
    database.records.find(
      item =>
        item.id === id
    );

  if (!record) return;


  if (
    record.type ===
    "medication"
  ) {

    const medication =
      medications.find(
        item =>
          item.id ===
          record.medicationId
      );

    if (medication) {
      openEditMedicationForm(
        medication.id
      );
    }

    return;
  }


  openRecordForm(
    record.type,
    record
  );
}


/* =========================================================
   EXCLUIR REGISTRO
========================================================= */

function deleteRecord(
  id
) {

  const record =
    database.records.find(
      item =>
        item.id === id
    );

  if (!record) return;


  const confirmed =
    confirm(
      "Mover este registro para a lixeira?"
    );

  if (!confirmed) return;


  database.trash.push({
    ...record,
    deletedAt:
      new Date()
        .toISOString()
  });


  database.records =
    database.records.filter(
      item =>
        item.id !== id
    );


  saveDatabase();

  renderDashboard();

  renderDiary();

  renderTrash();

  renderConsultations();
}


/* =========================================================
   CONSULTAS — HOME
========================================================= */

function renderConsultationsHome() {

  let container =
    document.getElementById(
      "consultationsHomePanel"
    );


  if (!container) {

    const timeline =
      document.getElementById(
        "timeline"
      );

    if (!timeline) return;


    container =
      document.createElement(
        "section"
      );

    container.id =
      "consultationsHomePanel";

    container.className =
      "card";

    timeline.insertAdjacentElement(
      "afterend",
      container
    );
  }


  const dateKey =
    formatDateKey(
      selectedDate
    );


  const consultations =
    database.records

      .filter(
        record =>
          record.type ===
            "consultation" &&
          record.date ===
            dateKey
      )

      .sort(
        (a, b) =>
          String(
            a.time || ""
          ).localeCompare(
            String(
              b.time || ""
            )
          )
      );


  let html = `

    <div
      class="section-header"
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
      "
    >

      <div>

        <h2>
          🩺 Consultas
        </h2>

        <p>
          Consultas agendadas para este dia.
        </p>

      </div>

      <button
        type="button"
        id="addConsultationHomeButton"
        class="primary-button"
      >
        + Nova consulta
      </button>

    </div>

  `;


  if (
    consultations.length === 0
  ) {

    html += `
      <div class="empty-state">
        Nenhuma consulta registrada para este dia.
      </div>
    `;

  } else {

    consultations.forEach(
      consultation => {

        html +=
          createConsultationCard(
            consultation
          );
      }
    );
  }


  container.innerHTML =
    html;


  const addButton =
    document.getElementById(
      "addConsultationHomeButton"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      () =>
        openRecordForm(
          "consultation"
        )
    );
  }
}


/* =========================================================
   CARD DA CONSULTA
========================================================= */

function createConsultationCard(
  consultation
) {

  return `

    <div
      class="card"
      style="
        margin-top:12px;
        padding:14px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
        "
      >

        <div>

          <strong>

            🩺
            ${escapeHTML(
              consultation.time
            )}
            ·
            ${escapeHTML(
              consultation.specialty ||
              "Consulta"
            )}

          </strong>


          <div
            style="
              margin-top:6px;
            "
          >
            ${escapeHTML(
              consultation.professional ||
              ""
            )}
          </div>


          ${
            consultation.location

              ? `
                <div
                  style="
                    margin-top:4px;
                    opacity:.7;
                  "
                >
                  📍
                  ${escapeHTML(
                    consultation.location
                  )}
                </div>
              `

              : ""
          }


          ${
            consultation.reason

              ? `
                <div
                  style="
                    margin-top:6px;
                  "
                >
                  ${escapeHTML(
                    consultation.reason
                  )}
                </div>
              `

              : ""
          }

        </div>


        <div
          style="
            display:flex;
            gap:6px;
          "
        >

          <button
            type="button"
            onclick="editRecord('${escapeHTML(consultation.id)}')"
            title="Editar consulta"
          >
            ✏️
          </button>

          <button
            type="button"
            onclick="deleteRecord('${escapeHTML(consultation.id)}')"
            title="Excluir consulta"
          >
            🗑️
          </button>

        </div>

      </div>

    </div>

  `;
}


/* =========================================================
   TELA DE CONSULTAS
========================================================= */

function renderConsultations() {

  let container =
    document.getElementById(
      "consultationsContent"
    );


  if (!container) {

    const screen =
      document.getElementById(
        "consultationScreen"
      );

    if (!screen) return;


    container =
      document.createElement(
        "div"
      );

    container.id =
      "consultationsContent";

    screen.appendChild(
      container
    );
  }


  const consultations =
    database.records

      .filter(
        record =>
          record.type ===
          "consultation"
      )

      .sort(
        (a, b) => {

          const dateA =
            `${a.date} ${
              a.time || ""
            }`;

          const dateB =
            `${b.date} ${
              b.time || ""
            }`;

          return dateA.localeCompare(
            dateB
          );
        }
      );


  /*
     IMPORTANTE:
     O título "Consultas" já existe
     no HTML da tela.

     Portanto, não criamos outro
     <h2> Consultas </h2> aqui.
  */

  let html = `

    <div
      class="section-header"
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
      "
    >

      <div>

        <p>
          Acompanhe suas consultas e compromissos de saúde.
        </p>

      </div>


      <button
        type="button"
        id="newConsultationButton"
        class="primary-button"
      >
        + Nova consulta
      </button>

    </div>

  `;


  if (
    consultations.length === 0
  ) {

    html += `

      <div class="empty-state">

        Nenhuma consulta cadastrada.

        <br><br>

        Cadastre sua primeira consulta para começar
        a organizar seus compromissos de saúde.

      </div>

    `;

  } else {

    html += `

      <div
        style="
          display:flex;
          flex-direction:column;
          gap:12px;
          margin-top:16px;
        "
      >

    `;


    consultations.forEach(
      consultation => {

        html += `

          <div
            class="card"
            style="
              padding:16px;
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                gap:12px;
              "
            >

              <div
                style="
                  flex:1;
                "
              >

                <div
                  style="
                    font-weight:700;
                    font-size:1.05rem;
                  "
                >

                  🩺
                  ${escapeHTML(
                    consultation.specialty ||
                    "Consulta"
                  )}

                </div>


                <div
                  style="
                    margin-top:8px;
                  "
                >

                  📅
                  ${escapeHTML(
                    consultation.date
                  )}

                  ·

                  ⏰
                  ${escapeHTML(
                    consultation.time
                  )}

                </div>


                ${
                  consultation.professional

                    ? `
                      <div
                        style="
                          margin-top:6px;
                        "
                      >

                        👩‍⚕️
                        ${escapeHTML(
                          consultation.professional
                        )}

                      </div>
                    `

                    : ""
                }


                ${
                  consultation.location

                    ? `
                      <div
                        style="
                          margin-top:6px;
                          opacity:.75;
                        "
                      >

                        📍
                        ${escapeHTML(
                          consultation.location
                        )}

                      </div>
                    `

                    : ""
                }


                ${
                  consultation.reason

                    ? `
                      <div
                        style="
                          margin-top:8px;
                        "
                      >

                        <strong>
                          Motivo:
                        </strong>

                        ${escapeHTML(
                          consultation.reason
                        )}

                      </div>
                    `

                    : ""
                }


                ${
                  consultation.note

                    ? `
                      <div
                        style="
                          margin-top:8px;
                        "
                      >

                        <strong>
                          Observações:
                        </strong>

                        <div
                          style="
                            white-space:pre-wrap;
                            margin-top:4px;
                          "
                        >
                          ${escapeHTML(
                            consultation.note
                          )}
                        </div>

                      </div>
                    `

                    : ""
                }

              </div>


              <div
                style="
                  display:flex;
                  gap:6px;
                  flex-shrink:0;
                "
              >

                <button
                  type="button"
                  onclick="editRecord('${escapeHTML(consultation.id)}')"
                  title="Editar"
                >
                  ✏️
                </button>


                <button
                  type="button"
                  onclick="deleteRecord('${escapeHTML(consultation.id)}')"
                  title="Excluir"
                >
                  🗑️
                </button>

              </div>

            </div>

          </div>

        `;
      }
    );


    html += `
      </div>
    `;
  }


  container.innerHTML =
    html;


  const newButton =
    document.getElementById(
      "newConsultationButton"
    );


  if (newButton) {

    newButton.addEventListener(
      "click",
      () =>
        openRecordForm(
          "consultation"
        )
    );
  }
}


/* =========================================================
   MEDICAMENTOS — HOME
========================================================= */

function renderMedicationHome() {

  let container =
    document.getElementById(
      "medicationHomePanel"
    );


  if (!container) {

    const quickActions =
      document.querySelector(
        ".quick-actions"
      );

    if (!quickActions) return;


    container =
      document.createElement(
        "section"
      );

    container.id =
      "medicationHomePanel";

    container.className =
      "card";


    quickActions.insertAdjacentElement(
      "afterend",
      container
    );
  }


  const dateKey =
    formatDateKey(
      selectedDate
    );


  let html = `

    <div
      class="section-header"
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
      "
    >

      <div>

        <h2>
          💊 Medicamentos / Suplementos e Vitaminas
        </h2>

        <p>
          Marque cada item conforme você tomar.
        </p>

      </div>


      <button
        type="button"
        id="manageMedicationsButton"
        class="secondary-button"
      >
        ⚙️ Gerenciar
      </button>

    </div>

  `;


  if (
    medications.length === 0
  ) {

    html += `

      <div class="empty-state">

        Nenhum medicamento ou vitamina cadastrado.

        <br><br>

        <button
          type="button"
          id="addFirstMedicationButton"
          class="primary-button"
        >
          + Adicionar medicamento, suplemento ou vitamina
        </button>

      </div>

    `;

    container.innerHTML =
      html;

    attachMedicationHomeEvents();

    return;
  }


  const periods = [

    {
      key:
        "morning",

      label:
        "🌅 Manhã"
    },

    {
      key:
        "afternoon",

      label:
        "☀️ Tarde"
    },

    {
      key:
        "night",

      label:
        "🌙 Noite"
    }

  ];


  periods.forEach(
    period => {

      const periodMedications =
        medications.filter(
          medication =>
            medication.active !==
              false &&
            medication.period ===
              period.key
        );


      if (
        periodMedications.length ===
        0
      ) {
        return;
      }


      html += `

        <div
          style="
            margin-top:18px;
          "
        >

          <h3>
            ${period.label}
          </h3>

      `;


      periodMedications.forEach(
        medication => {

          const taken =
            isMedicationTaken(
              medication.id,
              dateKey
            );


          html += `

            <label
              style="
                display:flex;
                align-items:center;
                gap:12px;
                padding:12px 0;
                cursor:pointer;
                border-bottom:1px solid rgba(0,0,0,.08);
              "
            >

              <input
                type="checkbox"
                class="medication-check"
                data-medication-id="${escapeHTML(medication.id)}"
                ${taken ? "checked" : ""}
              >

              <span
                style="
                  flex:1;
                  ${
                    taken
                      ? "text-decoration:line-through;opacity:.55;"
                      : ""
                  }
                "
              >

                ${escapeHTML(
                  medication.name
                )}

              </span>

            </label>

          `;
        }
      );


      html += `
        </div>
      `;
    }
  );


  container.innerHTML =
    html;

  attachMedicationHomeEvents();
}


/* =========================================================
   EVENTOS DOS MEDICAMENTOS
========================================================= */

function attachMedicationHomeEvents() {

  const manage =
    document.getElementById(
      "manageMedicationsButton"
    );

  const add =
    document.getElementById(
      "addFirstMedicationButton"
    );


  if (manage) {

    manage.addEventListener(
      "click",
      openMedicationManager
    );
  }


  if (add) {

    add.addEventListener(
      "click",
      () => {

        openMedicationManager();

        setTimeout(
          openAddMedicationForm,
          50
        );
      }
    );
  }


  document
    .querySelectorAll(
      ".medication-check"
    )
    .forEach(
      checkbox => {

        checkbox.addEventListener(
          "change",
          () => {

            toggleMedicationTaken(
              checkbox.dataset
                .medicationId,

              checkbox.checked
            );
          }
        );
      }
    );
}


/* =========================================================
   VERIFICAR MEDICAMENTO
========================================================= */

function isMedicationTaken(
  medicationId,
  dateKey
) {

  return database.records.some(
    record =>

      record.type ===
        "medication" &&

      record.medicationId ===
        medicationId &&

      record.date ===
        dateKey &&

      record.taken ===
        true
  );
}


/* =========================================================
   MARCAR / DESMARCAR
========================================================= */

function toggleMedicationTaken(
  medicationId,
  checked
) {

  const dateKey =
    formatDateKey(
      selectedDate
    );


  const medication =
    medications.find(
      item =>
        item.id ===
        medicationId
    );


  if (!medication) return;


  const existingIndex =
    database.records.findIndex(
      record =>

        record.type ===
          "medication" &&

        record.medicationId ===
          medicationId &&

        record.date ===
          dateKey
    );


  if (checked) {

    const record = {

      id:
        existingIndex !== -1
          ? database.records[
              existingIndex
            ].id
          : generateId(),

      type:
        "medication",

      medicationId:
        medicationId,

      medicationName:
        medication.name,

      period:
        medication.period,

      date:
        dateKey,

      time:
        currentTime(),

      taken:
        true,

      createdAt:
        existingIndex !== -1
          ? database.records[
              existingIndex
            ].createdAt ||
            new Date()
              .toISOString()
          : new Date()
              .toISOString(),

      updatedAt:
        new Date()
          .toISOString()
    };


    if (
      existingIndex !==
      -1
    ) {

      database.records[
        existingIndex
      ] = {
        ...database.records[
          existingIndex
        ],
        ...record
      };

    } else {

      database.records.push(
        record
      );
    }

  } else {

    if (
      existingIndex !==
      -1
    ) {

      database.records.splice(
        existingIndex,
        1
      );
    }
  }


  saveDatabase();

  renderDashboard();

  renderDiary();
}


/* =========================================================
   GERENCIADOR
========================================================= */

function openMedicationManager() {

  let manager =
    document.getElementById(
      "medicationManager"
    );


  if (!manager) {

    manager =
      document.createElement(
        "dialog"
      );

    manager.id =
      "medicationManager";

    document.body.appendChild(
      manager
    );
  }


  renderMedicationManager();

  manager.showModal();
}


/* =========================================================
   RENDERIZAR GERENCIADOR
========================================================= */

function renderMedicationManager() {

  const manager =
    document.getElementById(
      "medicationManager"
    );

  if (!manager) return;


  manager.innerHTML = `

    <form
      method="dialog"
      style="
        padding:24px;
        min-width:min(90vw,520px);
        max-height:85vh;
        overflow:auto;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        "
      >

        <h2>
          💊 Medicamentos / Suplementos e Vitaminas
        </h2>

        <button
          type="submit"
          class="icon-button"
        >
          ✕
        </button>

      </div>


      <p>
        Cadastre cada item separadamente e escolha
        o período em que ele é tomado.
      </p>


      <button
        type="button"
        id="newMedicationButton"
        class="primary-button"
        style="margin:16px 0;"
      >
        + Adicionar medicamento, suplemento ou vitamina
      </button>


      <div
        id="medicationList"
      ></div>

    </form>

  `;


  const list =
    document.getElementById(
      "medicationList"
    );


  if (
    medications.length ===
    0
  ) {

    list.innerHTML = `
      <div class="empty-state">
        Nenhum medicamento ou vitamina cadastrado.
      </div>
    `;

  } else {

    list.innerHTML =
      medications
        .map(
          createMedicationManagerItem
        )
        .join("");
  }


  document
    .getElementById(
      "newMedicationButton"
    )
    .addEventListener(
      "click",
      openAddMedicationForm
    );


  manager
    .querySelectorAll(
      "[data-edit-medication]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            openEditMedicationForm(
              button.dataset
                .editMedication
            )
        );
      }
    );


  manager
    .querySelectorAll(
      "[data-delete-medication]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            deleteMedication(
              button.dataset
                .deleteMedication
            )
        );
      }
    );
}


/* =========================================================
   ITEM DO GERENCIADOR
========================================================= */

function createMedicationManagerItem(
  medication
) {

  const periodLabels = {

    morning:
      "Manhã",

    afternoon:
      "Tarde",

    night:
      "Noite"
  };


  return `

    <div
      class="card"
      style="
        margin-bottom:12px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        "
      >

        <div>

          <strong>
            ${escapeHTML(
              medication.name
            )}
          </strong>


          <div
            style="
              margin-top:4px;
              opacity:.7;
            "
          >

            ${escapeHTML(
              periodLabels[
                medication.period
              ] ||
              medication.period
            )}

            ${
              medication.time
                ? ` · ${escapeHTML(
                    medication.time
                  )}`
                : ""
            }

          </div>

        </div>


        <div
          style="
            display:flex;
            gap:6px;
          "
        >

          <button
            type="button"
            data-edit-medication="${escapeHTML(medication.id)}"
            title="Editar"
          >
            ✏️
          </button>

          <button
            type="button"
            data-delete-medication="${escapeHTML(medication.id)}"
            title="Excluir"
          >
            🗑️
          </button>

        </div>

      </div>

    </div>

  `;
}


/* =========================================================
   FORMULÁRIO MEDICAMENTO
========================================================= */

function openAddMedicationForm() {

  renderMedicationForm();
}


function openEditMedicationForm(
  id
) {

  const medication =
    medications.find(
      item =>
        item.id === id
    );

  if (!medication) return;

  renderMedicationForm(
    medication
  );
}


function renderMedicationForm(
  medication = null
) {

  const manager =
    document.getElementById(
      "medicationManager"
    );

  if (!manager) return;


  const isEditing =
    Boolean(
      medication
    );


  manager.innerHTML = `

    <form
      id="medicationForm"
      style="
        padding:24px;
        min-width:min(90vw,520px);
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
        "
      >

        <h2>
          ${
            isEditing
              ? "Editar medicamento / suplemento / vitamina"
              : "Novo medicamento / suplemento / vitamina"
          }
        </h2>

        <button
          type="button"
          id="closeMedicationForm"
          class="icon-button"
        >
          ✕
        </button>

      </div>


      <div class="form-group">

        <label for="medicationName">
          Nome
        </label>

        <input
          id="medicationName"
          type="text"
          value="${
            medication
              ? escapeHTML(
                  medication.name
                )
              : ""
          }"
          placeholder="Ex.: Vitamina D"
          required
        >

      </div>


      <div class="form-group">

        <label for="medicationPeriod">
          Período
        </label>

        <select
          id="medicationPeriod"
          required
        >

          <option
            value="morning"
            ${
              medication &&
              medication.period ===
                "morning"
                ? "selected"
                : ""
            }
          >
            🌅 Manhã
          </option>


          <option
            value="afternoon"
            ${
              medication &&
              medication.period ===
                "afternoon"
                ? "selected"
                : ""
            }
          >
            ☀️ Tarde
          </option>


          <option
            value="night"
            ${
              medication &&
              medication.period ===
                "night"
                ? "selected"
                : ""
            }
          >
            🌙 Noite
          </option>

        </select>

      </div>


      <div class="form-group">

        <label for="medicationTime">
          Horário
        </label>

        <input
          id="medicationTime"
          type="time"
          value="${
            medication &&
            medication.time
              ? escapeHTML(
                  medication.time
                )
              : ""
          }"
          required
        >

      </div>


      <div
        style="
          display:flex;
          gap:8px;
          margin-top:20px;
        "
      >

        <button
          type="button"
          id="cancelMedicationForm"
          class="secondary-button"
        >
          Cancelar
        </button>

        <button
          type="submit"
          class="primary-button"
        >
          Salvar
        </button>

      </div>

    </form>

  `;


  document
    .getElementById(
      "closeMedicationForm"
    )
    .addEventListener(
      "click",
      renderMedicationManager
    );


  document
    .getElementById(
      "cancelMedicationForm"
    )
    .addEventListener(
      "click",
      renderMedicationManager
    );


  document
    .getElementById(
      "medicationForm"
    )
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();


        const name =
          document.getElementById(
            "medicationName"
          ).value.trim();


        const period =
          document.getElementById(
            "medicationPeriod"
          ).value;


        const time =
          document.getElementById(
            "medicationTime"
          ).value;


        if (
          !name ||
          !time
        ) {
          return;
        }


        if (isEditing) {

          const index =
            medications.findIndex(
              item =>
                item.id ===
                medication.id
            );


          if (index !== -1) {

            medications[index] = {

              ...medications[index],

              name,

              period,

              time,

              active:
                true
            };
          }


          database.records =
            database.records.map(
              record => {

                if (
                  record.type ===
                    "medication" &&
                  record.medicationId ===
                    medication.id
                ) {

                  return {
                    ...record,

                    medicationName:
                      name,

                    period
                  };
                }

                return record;
              }
            );

        } else {

          medications.push({

            id:
              generateMedicationId(),

            name,

            period,

            time,

            active:
              true
          });
        }


        saveMedications();

        saveDatabase();

        renderMedicationManager();

        renderMedicationHome();

        renderDashboard();
      }
    );
}


/* =========================================================
   EXCLUIR MEDICAMENTO
========================================================= */

function deleteMedication(
  id
) {

  const medication =
    medications.find(
      item =>
        item.id === id
    );

  if (!medication) return;


  const confirmed =
    confirm(
      `Excluir "${medication.name}" da lista de medicamentos / suplementos e vitaminas?`
    );


  if (!confirmed) return;


  medications =
    medications.filter(
      item =>
        item.id !== id
    );


  database.records =
    database.records.filter(
      record =>
        !(
          record.type ===
            "medication" &&
          record.medicationId ===
            id
        )
    );


  saveMedications();

  saveDatabase();

  renderMedicationManager();

  renderMedicationHome();

  renderDashboard();
}


/* =========================================================
   BOTÕES PRINCIPAIS
   CRIAR REGISTROS
========================================================= */

document
  .querySelectorAll(
    "[data-record-type]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          openRecordForm(
            button.dataset
              .recordType
          );
        }
      );
    }
  );


/* =========================================================
   BOTÃO CONSULTAS
========================================================= */

const consultationQuickButton =
  document.getElementById(
    "consultationQuickButton"
  );


if (
  consultationQuickButton
) {

  consultationQuickButton.addEventListener(
    "click",
    () => {

      openConsultationsScreen();
    }
  );
}


/* =========================================================
   FECHAR MODAL
========================================================= */

const closeModal =
  document.getElementById(
    "closeModal"
  );


if (closeModal) {

  closeModal.addEventListener(
    "click",
    () => {

      if (modal) {
        modal.close();
      }
    }
  );
}


const cancelButton =
  document.getElementById(
    "cancelButton"
  );


if (cancelButton) {

  cancelButton.addEventListener(
    "click",
    () => {

      if (modal) {
        modal.close();
      }
    }
  );
}


/* =========================================================
   NAVEGAÇÃO POR DIAS
========================================================= */

const previousDay =
  document.getElementById(
    "previousDay"
  );


if (previousDay) {

  previousDay.addEventListener(
    "click",
    () => {

      selectedDate.setDate(
        selectedDate.getDate() -
        1
      );

      renderDashboard();
    }
  );
}


const nextDay =
  document.getElementById(
    "nextDay"
  );


if (nextDay) {

  nextDay.addEventListener(
    "click",
    () => {

      selectedDate.setDate(
        selectedDate.getDate() +
        1
      );

      renderDashboard();
    }
  );
}


/* =========================================================
   DIÁRIO
========================================================= */

function renderDiary() {

  const container =
    document.getElementById(
      "diaryContent"
    );

  if (!container) return;


  if (
    database.records.length ===
    0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        Nenhum registro encontrado.

      </div>

    `;

    return;
  }


  const sortedRecords =
    [
      ...database.records
    ].sort(
      (a, b) => {

        const dateA =
          `${a.date} ${
            a.time || ""
          }`;

        const dateB =
          `${b.date} ${
            b.time || ""
          }`;

        return dateB.localeCompare(
          dateA
        );
      }
    );


  container.innerHTML =
    sortedRecords
      .map(
        createDiaryItem
      )
      .join("");
}


/* =========================================================
   ITEM DO DIÁRIO
========================================================= */

function createDiaryItem(
  record
) {

  const icons = {

    meal:
      "🍽️",

    glucose:
      "🩸",

    insulin:
      "💉",

    activity:
      "🏋️",

    medication:
      "💊",

    consultation:
      "🩺"
  };


  let title = "";
  let detail = "";


  if (
    record.type ===
    "meal"
  ) {

    title =
      record.mealType ||
      "Refeição";

    detail =
      record.food ||
      "Refeição registrada";

  } else if (
    record.type ===
    "glucose"
  ) {

    title =
      `${record.value} mg/dL`;

    detail =
      record.kind ||
      "Glicemia";

  } else if (
    record.type ===
    "insulin"
  ) {

    title =
      `${record.dose} U`;

    detail =
      record.insulin ||
      "Insulina";

    if (record.application) {

      detail +=
        ` · ${record.application}`;
    }

  } else if (
    record.type ===
    "activity"
  ) {

    title =
      record.activity ||
      "Atividade";

    detail =
      `${record.duration || 0} min`;

    if (record.intensity) {

      detail +=
        ` · ${record.intensity}`;
    }

  } else if (
    record.type ===
    "medication"
  ) {

    title =
      record.medicationName ||
      "Medicamento / suplemento / vitamina";

    detail =
      "Tomado";


    if (record.period) {

      const periods = {

        morning:
          "Manhã",

        afternoon:
          "Tarde",

        night:
          "Noite"
      };


      detail +=
        ` · ${
          periods[
            record.period
          ] ||
          record.period
        }`;
    }

  } else if (
    record.type ===
    "consultation"
  ) {

    title =
      record.specialty ||
      "Consulta";

    detail =
      record.professional ||
      "Consulta médica";

    if (record.location) {

      detail +=
        ` · ${record.location}`;
    }
  }


  return `

    <div
      class="timeline-item"
      style="
        margin-bottom:12px;
      "
    >

      <div class="timeline-icon">
        ${
          icons[
            record.type
          ] ||
          "📝"
        }
      </div>


      <div class="timeline-content">

        <div class="timeline-title">

          ${escapeHTML(
            record.date
          )}

          ·

          ${escapeHTML(
            record.time || ""
          )}

        </div>


        <div class="timeline-detail">

          ${escapeHTML(
            title
          )}

          ·

          ${escapeHTML(
            detail
          )}

        </div>

      </div>

    </div>

  `;
}


/* =========================================================
   LIXEIRA
========================================================= */

function renderTrash() {

  const container =
    document.getElementById(
      "trashContent"
    );

  if (!container) return;


  if (
    !database.trash ||
    database.trash.length ===
      0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        A lixeira está vazia.

      </div>

    `;

    return;
  }


  const sortedTrash =
    [
      ...database.trash
    ].sort(
      (a, b) =>
        new Date(
          b.deletedAt
        ) -
        new Date(
          a.deletedAt
        )
    );


  container.innerHTML = `

    <div
      style="
        display:flex;
        gap:8px;
        margin-bottom:16px;
        flex-wrap:wrap;
      "
    >

      <button
        type="button"
        id="emptyTrashButton"
        class="secondary-button"
      >
        Esvaziar lixeira
      </button>

    </div>


    ${
      sortedTrash
        .map(
          createTrashItem
        )
        .join("")
    }

  `;


  const button =
    document.getElementById(
      "emptyTrashButton"
    );


  if (button) {

    button.addEventListener(
      "click",
      emptyTrash
    );
  }
}


/* =========================================================
   ITEM DA LIXEIRA
========================================================= */

function createTrashItem(
  record
) {

  const icons = {

    meal:
      "🍽️",

    glucose:
      "🩸",

    insulin:
      "💉",

    activity:
      "🏋️",

    medication:
      "💊",

    consultation:
      "🩺"
  };


  let title = "";
  let detail = "";


  if (
    record.type ===
    "meal"
  ) {

    title =
      record.mealType ||
      "Refeição";

    detail =
      record.food ||
      "Refeição registrada";

  } else if (
    record.type ===
    "glucose"
  ) {

    title =
      `${record.value} mg/dL`;

    detail =
      record.kind ||
      "Glicemia";

  } else if (
    record.type ===
    "insulin"
  ) {

    title =
      `${record.dose} U`;

    detail =
      record.insulin ||
      "Insulina";

  } else if (
    record.type ===
    "activity"
  ) {

    title =
      record.activity ||
      "Atividade";

    detail =
      `${record.duration || 0} min`;

  } else if (
    record.type ===
    "medication"
  ) {

    title =
      record.medicationName ||
      "Medicamento / suplemento / vitamina";

    detail =
      "Tomado";

  } else if (
    record.type ===
    "consultation"
  ) {

    title =
      record.specialty ||
      "Consulta";

    detail =
      record.professional ||
      "Consulta médica";
  }


  return `

    <div
      class="timeline-item"
      style="
        margin-bottom:12px;
      "
    >

      <div class="timeline-icon">

        ${
          icons[
            record.type
          ] ||
          "📝"
        }

      </div>


      <div class="timeline-content">

        <div class="timeline-title">

          ${escapeHTML(
            record.time || ""
          )}

          ·

          ${escapeHTML(
            title
          )}

        </div>


        <div class="timeline-detail">

          ${escapeHTML(
            detail
          )}

        </div>


        <div
          class="timeline-detail"
          style="
            margin-top:4px;
          "
        >

          ${escapeHTML(
            record.date || ""
          )}

        </div>

      </div>


      <div class="timeline-actions">

        <button
          type="button"
          onclick="restoreRecord('${escapeHTML(record.id)}')"
          title="Restaurar"
        >
          ↩️
        </button>


        <button
          type="button"
          onclick="permanentlyDeleteRecord('${escapeHTML(record.id)}')"
          title="Excluir definitivamente"
        >
          ❌
        </button>

      </div>

    </div>

  `;
}


/* =========================================================
   RESTAURAR DA LIXEIRA
========================================================= */

function restoreRecord(
  id
) {

  const index =
    database.trash.findIndex(
      item =>
        item.id === id
    );

  if (index === -1) return;


  const record =
    database.trash[index];


  const restoredRecord = {
    ...record
  };


  delete restoredRecord.deletedAt;


  database.records.push(
    restoredRecord
  );


  database.trash.splice(
    index,
    1
  );


  saveDatabase();

  renderTrash();

  renderDashboard();

  renderDiary();

  renderConsultations();


  alert(
    "Registro restaurado."
  );
}


/* =========================================================
   EXCLUIR DEFINITIVAMENTE DA LIXEIRA
========================================================= */

function permanentlyDeleteRecord(
  id
) {

  const confirmed =
    confirm(
      "Excluir este registro definitivamente? Esta ação não poderá ser desfeita."
    );


  if (!confirmed) return;


  database.trash =
    database.trash.filter(
      item =>
        item.id !== id
    );


  saveDatabase();

  renderTrash();
}


/* =========================================================
   ESVAZIAR LIXEIRA
========================================================= */

function emptyTrash() {

  if (
    !database.trash ||
    database.trash.length ===
      0
  ) {
    return;
  }


  const confirmed =
    confirm(
      "Esvaziar toda a lixeira? Todos esses registros serão excluídos definitivamente."
    );


  if (!confirmed) return;


  database.trash = [];


  saveDatabase();

  renderTrash();
}


/* =========================================================
   CONFIGURAÇÕES DE GLICEMIA
========================================================= */

function renderGlucoseSettings() {

  const container =
    document.getElementById(
      "settingsPanel"
    );

  if (!container) return;


  const items = [

    [
      "fasting",
      "Jejum"
    ],

    [
      "breakfast1",
      "1h após o café da manhã"
    ],

    [
      "breakfast2",
      "2h após o café da manhã"
    ],

    [
      "morningSnack1",
      "1h após o lanche da manhã"
    ],

    [
      "morningSnack2",
      "2h após o lanche da manhã"
    ],

    [
      "lunch1",
      "1h após o almoço"
    ],

    [
      "lunch2",
      "2h após o almoço"
    ],

    [
      "afternoonSnack1",
      "1h após o lanche da tarde"
    ],

    [
      "afternoonSnack2",
      "2h após o lanche da tarde"
    ],

    [
      "dinner1",
      "1h após o jantar"
    ],

    [
      "dinner2",
      "2h após o jantar"
    ],

    [
      "supper1",
      "1h após a ceia"
    ],

    [
      "supper2",
      "2h após a ceia"
    ]

  ];


  let html = `

    <h2>
      Configurações
    </h2>


    <div class="card">

      <h3>
        Medições de glicemia
      </h3>


      <p>
        Ative somente os momentos em que você deseja
        que apareçam no registro de glicemia.
      </p>


      <div
        style="
          display:flex;
          flex-direction:column;
          gap:12px;
          margin-top:16px;
        "
      >

  `;


  items.forEach(
    item => {

      html += `

        <label
          style="
            display:flex;
            align-items:center;
            gap:10px;
            cursor:pointer;
          "
        >

          <input
            type="checkbox"
            class="glucose-setting-checkbox"
            data-glucose-key="${item[0]}"
            ${
              glucoseSettings[
                item[0]
              ]
                ? "checked"
                : ""
            }
          >

          <span>
            ${escapeHTML(
              item[1]
            )}
          </span>

        </label>

      `;
    }
  );


  html += `

      </div>

    </div>

  `;


  container.innerHTML =
    html;


  container
    .querySelectorAll(
      ".glucose-setting-checkbox"
    )
    .forEach(
      checkbox => {

        checkbox.addEventListener(
          "change",
          () => {

            const key =
              checkbox.dataset
                .glucoseKey;

            glucoseSettings[
              key
            ] =
              checkbox.checked;

            saveGlucoseSettings();
          }
        );
      }
    );
}


/* =========================================================
   TELA "MAIS" E PAINÉIS
========================================================= */

function renderMoreScreen() {

  const trashPanel =
    document.getElementById(
      "trashPanel"
    );

  const settingsPanel =
    document.getElementById(
      "settingsPanel"
    );


  if (trashPanel) {
    trashPanel.hidden =
      true;
  }


  if (settingsPanel) {
    settingsPanel.hidden =
      true;
  }
}


const openTrashButton =
  document.getElementById(
    "openTrashButton"
  );


if (openTrashButton) {

  openTrashButton.addEventListener(
    "click",
    () => {

      const trashPanel =
        document.getElementById(
          "trashPanel"
        );

      const settingsPanel =
        document.getElementById(
          "settingsPanel"
        );


      if (trashPanel) {
        trashPanel.hidden =
          false;
      }


      if (settingsPanel) {
        settingsPanel.hidden =
          true;
      }


      renderTrash();
    }
  );
}


const settingsButton =
  document.getElementById(
    "settingsButton"
  );


if (settingsButton) {

  settingsButton.addEventListener(
    "click",
    () => {

      const trashPanel =
        document.getElementById(
          "trashPanel"
        );

      const settingsPanel =
        document.getElementById(
          "settingsPanel"
        );


      if (trashPanel) {
        trashPanel.hidden =
          true;
      }


      if (settingsPanel) {
        settingsPanel.hidden =
          false;
      }


      renderGlucoseSettings();
    }
  );
}


/* =========================================================
   NAVEGAÇÃO PRINCIPAL
========================================================= */

const navigationItems =
  document.querySelectorAll(
    ".navigation-item"
  );


navigationItems.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        const targetScreen =
          button.dataset.screen;

        if (!targetScreen) {
          return;
        }

        showScreen(
          targetScreen
        );
      }
    );
  }
);


/* =========================================================
   DELEGAÇÃO DE CLIQUE
   BOTÃO DE MEDICAMENTOS
========================================================= */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "button"
      );

    if (!button) return;


    const text =
      button.textContent
        .replace(
          /\s+/g,
          " "
        )
        .trim()
        .toLowerCase();


    if (

      text.includes(
        "medicamentos / suplementos e vitaminas"
      ) ||

      text.includes(
        "medicamentos/suplementos e vitaminas"
      )

    ) {

      event.preventDefault();

      openMedicationManager();
    }
  }
);


/* =========================================================
   BACKUP
========================================================= */

const backupButton =
  document.getElementById(
    "backupButton"
  );


if (backupButton) {

  backupButton.addEventListener(
    "click",
    createBackup
  );
}


function createBackup() {

  const backup = {

    application:
      "Recordatório + Registros",

    version:
      "0.1",

    createdAt:
      new Date()
        .toISOString(),

    data: {

      records:
        database.records,

      trash:
        database.trash
    },

    glucoseSettings:
      glucoseSettings,

    medications:
      medications
  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    `Recordatorio_Backup_${formatDateKey(
      new Date()
    )}.json`;


  document.body.appendChild(
    link
  );


  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );
}


/* =========================================================
   RESTAURAÇÃO
========================================================= */

function restoreBackupFile(
  file
) {

  if (!file) return;


  const reader =
    new FileReader();


  reader.onload =
    function(event) {

      try {

        const backup =
          JSON.parse(
            event.target.result
          );


        if (
          !validateBackup(
            backup
          )
        ) {

          alert(
            "Este arquivo não é um backup válido do Recordatório + Registros."
          );

          return;
        }


        const confirmed =
          confirm(
            "Restaurar este backup substituirá os registros atuais do aplicativo. Deseja continuar?"
          );


        if (!confirmed) {
          return;
        }


        database = {

          records:
            backup.data.records,

          trash:
            backup.data.trash
        };


        glucoseSettings = {

          ...defaultGlucoseOptions,

          ...backup.glucoseSettings
        };


        medications =
          Array.isArray(
            backup.medications
          )
            ? backup.medications
            : [];


        saveDatabase();

        saveGlucoseSettings();

        saveMedications();


        renderDashboard();

        renderDiary();

        renderTrash();

        renderConsultations();


        alert(
          "Backup restaurado com sucesso."
        );


      } catch (error) {

        console.error(
          "Erro ao restaurar backup:",
          error
        );


        alert(
          "Não foi possível ler este arquivo de backup."
        );
      }
    };


  reader.readAsText(
    file
  );
}


/* =========================================================
   VALIDAR BACKUP
========================================================= */

function validateBackup(
  backup
) {

  return Boolean(

    backup &&

    typeof backup ===
      "object" &&

    backup.application ===
      "Recordatório + Registros" &&

    backup.data &&

    typeof backup.data ===
      "object" &&

    Array.isArray(
      backup.data.records
    ) &&

    Array.isArray(
      backup.data.trash
    ) &&

    backup.glucoseSettings &&

    typeof backup.glucoseSettings ===
      "object"
  );
}


/* =========================================================
   BOTÃO RESTAURAR BACKUP
========================================================= */

const restoreBackupButton =
  document.getElementById(
    "restoreBackupButton"
  );


const restoreBackupInput =
  document.getElementById(
    "restoreBackupInput"
  );


if (restoreBackupButton) {

  restoreBackupButton.addEventListener(
    "click",
    () => {

      if (
        restoreBackupInput
      ) {

        restoreBackupInput.click();
      }
    }
  );
}


if (restoreBackupInput) {

  restoreBackupInput.addEventListener(
    "change",
    event => {

      const file =
        event.target.files &&
        event.target.files[0];


      restoreBackupFile(
        file
      );


      event.target.value =
        "";
    }
  );
}


/* =========================================================
   INICIALIZAÇÃO DO APLICATIVO
========================================================= */

renderDashboard();

renderDiary();

renderTrash();

renderConsultations();
