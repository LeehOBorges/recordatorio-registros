/* =========================================================
   RECORDATÓRIO + REGISTROS
   APP.JS COMPLETO — VERSÃO 0.2

   REFEIÇÕES
   GLICEMIA
   INSULINA
   ATIVIDADE
   MEDICAMENTOS / SUPLEMENTOS / VITAMINAS
   CONSULTAS
   DIÁRIO / HISTÓRICO
   LIXEIRA
   BACKUP E RESTAURAÇÃO
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY =
  "recordatorio_registros_v01";

const GLUCOSE_SETTINGS_KEY =
  "recordatorio_glicemia_config_v01";

const MEDICATION_SETTINGS_KEY =
  "recordatorio_medicamentos_config_v01";


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

let database =
  loadDatabase();

let glucoseSettings =
  loadGlucoseSettings();

let medications =
  loadMedications();

let selectedDate =
  new Date();

let editingId =
  null;

let currentRecordType =
  null;

let modal = null;
let form = null;
let formFields = null;
let modalTitle = null;


/* =========================================================
   BANCO DE DADOS
========================================================= */

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

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(database)
    );

  } catch (error) {

    console.error(
      "Erro ao salvar banco:",
      error
    );

    alert(
      "Não foi possível salvar os dados neste dispositivo."
    );
  }
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

  try {

    localStorage.setItem(
      GLUCOSE_SETTINGS_KEY,
      JSON.stringify(
        glucoseSettings
      )
    );

  } catch (error) {

    console.error(
      "Erro ao salvar configurações de glicemia:",
      error
    );
  }
}


/* =========================================================
   MEDICAMENTOS
========================================================= */

function loadMedications() {

  try {

    const stored =
      localStorage.getItem(
        MEDICATION_SETTINGS_KEY
      );

    if (!stored) {
      return [];
    }

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

  try {

    localStorage.setItem(
      MEDICATION_SETTINGS_KEY,
      JSON.stringify(
        medications
      )
    );

  } catch (error) {

    console.error(
      "Erro ao salvar medicamentos:",
      error
    );
  }
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
   IDs
========================================================= */

function generateId() {

  return (
    Date.now().toString(36) +
    "_" +
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

  return (
    `${year}-${month}-${day}`
  );
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

  return String(value ?? "")
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
   ELEMENTOS DO DOM
========================================================= */

function initializeElements() {

  modal =
    document.getElementById(
      "recordModal"
    );

  form =
    document.getElementById(
      "recordForm"
    );

  formFields =
    document.getElementById(
      "formFields"
    );

  modalTitle =
    document.getElementById(
      "modalTitle"
    );
}


/* =========================================================
   DATA DO CABEÇALHO
========================================================= */

function renderDate() {

  const element =
    document.getElementById(
      "currentDate"
    );

  if (!element) {
    return;
  }

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
}


/* =========================================================
   NAVEGAÇÃO ENTRE TELAS
========================================================= */

function showScreen(
  targetScreen
) {

  if (!targetScreen) {
    return;
  }

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


  if (
    targetScreen ===
    "homeScreen"
  ) {

    renderDashboard();
  }
}


/* =========================================================
   CONSULTAS
========================================================= */

function openConsultationsScreen() {

  showScreen(
    "consultationScreen"
  );

  renderConsultations();
}


/* =========================================================
   DASHBOARD / HOME
========================================================= */

function renderDashboard() {

  renderDate();

  const records =
    getTodayRecords();


  const meals =
    records.filter(
      record =>
        record.type ===
        "meal"
    );


  const glucose =
    records.filter(
      record =>
        record.type ===
        "glucose"
    );


  const insulin =
    records.filter(
      record =>
        record.type ===
        "insulin"
    );


  const activities =
    records.filter(
      record =>
        record.type ===
        "activity"
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


  renderConsultationsHome();
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

  if (!timeline) {
    return;
  }


  if (
    records.length ===
    0
  ) {

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


    if (
      record.quantity
    ) {

      detail +=
        ` · ${record.quantity}`;
    }
  }


  else if (
    record.type ===
    "glucose"
  ) {

    title =
      `${record.value} mg/dL`;

    detail =
      record.kind ||
      "Glicemia";
  }


  else if (
    record.type ===
    "insulin"
  ) {

    title =
      `${record.dose} U`;

    detail =
      record.insulin ||
      "Insulina";


    if (
      record.application
    ) {

      detail +=
        ` · ${record.application}`;
    }
  }


  else if (
    record.type ===
    "activity"
  ) {

    title =
      record.activity ||
      "Atividade";

    detail =
      `${record.duration || 0} min`;


    if (
      record.intensity
    ) {

      detail +=
        ` · ${record.intensity}`;
    }
  }


  else if (
    record.type ===
    "medication"
  ) {

    title =
      record.medicationName ||
      "Medicamento / suplemento / vitamina";

    detail =
      "Tomado";


    if (
      record.period
    ) {

      const periodLabels = {

        morning:
          "Manhã",

        afternoon:
          "Tarde",

        night:
          "Noite"
      };


      detail +=
        ` · ${
          periodLabels[
            record.period
          ] ||
          record.period
        }`;
    }
  }


  else if (
    record.type ===
    "consultation"
  ) {

    title =
      record.specialty ||
      "Consulta";

    detail =
      record.professional ||
      "Consulta médica";


    if (
      record.location
    ) {

      detail +=
        ` · ${record.location}`;
    }
  }


  return `

    <div class="timeline-item">

      <div class="timeline-icon">
        ${
          icons[
            record.type
          ] || "📝"
        }
      </div>

      <div class="timeline-content">

        <div class="timeline-title">

          ${escapeHTML(
            record.time
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

      </div>

      <div class="timeline-actions">

        <button
          type="button"
          onclick="editRecord('${escapeHTML(
            record.id
          )}')"
          title="Editar"
        >
          ✏️
        </button>

        <button
          type="button"
          onclick="deleteRecord('${escapeHTML(
            record.id
          )}')"
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

          value:
            item[1],

          label:
            item[1]
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
      titles[type] ||
      "Novo registro";
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
        value="${escapeHTML(
          date
        )}"
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
        value="${escapeHTML(
          time
        )}"
        required
      >

    </div>
  `;


  /* =======================================================
     REFEIÇÃO
  ======================================================= */

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

          <option>Café da manhã</option>

          <option>Lanche da manhã</option>

          <option>Almoço</option>

          <option>Lanche da tarde</option>

          <option>Jantar</option>

          <option>Ceia</option>

          <option>Outra</option>

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


  /* =======================================================
     GLICEMIA
  ======================================================= */

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
              value="${escapeHTML(
                option.value
              )}"
              ${
                record &&
                record.kind ===
                  option.value
                  ? "selected"
                  : ""
              }
            >
              ${escapeHTML(
                option.label
              )}
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


  /* =======================================================
     INSULINA
  ======================================================= */

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

          <option>Em jejum</option>

          <option>Antes do almoço</option>

          <option>À noite</option>

          <option>Outra</option>

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


  /* =======================================================
     ATIVIDADE
  ======================================================= */

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

          <option>Musculação</option>

          <option>Caminhada</option>

          <option>Corrida</option>

          <option>Bicicleta</option>

          <option>Alongamento</option>

          <option>Outra</option>

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

          <option>Leve</option>

          <option>Moderada</option>

          <option>Intensa</option>

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


  /* =======================================================
     CONSULTA
  ======================================================= */

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

    if (
      typeof modal.showModal ===
      "function"
    ) {

      modal.showModal();

    } else {

      modal.setAttribute(
        "open",
        ""
      );
    }
  }
}


/* =========================================================
   PREENCHER CAMPOS DE EDIÇÃO
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

function handleRecordSubmit(
  event
) {

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
      new Date().toISOString()
  };


  /* =======================================================
     REFEIÇÃO
  ======================================================= */

  if (
    currentRecordType ===
    "meal"
  ) {

    const mealType =
      document.getElementById(
        "mealType"
      );

    const food =
      document.getElementById(
        "food"
      );

    const quantity =
      document.getElementById(
        "quantity"
      );

    const note =
      document.getElementById(
        "note"
      );


    record.mealType =
      mealType
        ? mealType.value
        : "";

    record.food =
      food
        ? food.value.trim()
        : "";

    record.quantity =
      quantity
        ? quantity.value.trim()
        : "";

    record.note =
      note
        ? note.value.trim()
        : "";
  }


  /* =======================================================
     GLICEMIA
  ======================================================= */

  if (
    currentRecordType ===
    "glucose"
  ) {

    const value =
      document.getElementById(
        "glucoseValue"
      );

    const kind =
      document.getElementById(
        "glucoseKind"
      );

    const note =
      document.getElementById(
        "glucoseNote"
      );


    record.value =
      value
        ? value.value
        : "";

    record.kind =
      kind
        ? kind.value
        : "";

    record.note =
      note
        ? note.value.trim()
        : "";
  }


  /* =======================================================
     INSULINA
  ======================================================= */

  if (
    currentRecordType ===
    "insulin"
  ) {

    const name =
      document.getElementById(
        "insulinName"
      );

    const dose =
      document.getElementById(
        "insulinDose"
      );

    const application =
      document.getElementById(
        "application"
      );

    const note =
      document.getElementById(
        "insulinNote"
      );


    record.insulin =
      name
        ? name.value.trim()
        : "";

    record.dose =
      dose
        ? dose.value
        : "";

    record.application =
      application
        ? application.value
        : "";

    record.note =
      note
        ? note.value.trim()
        : "";
  }


  /* =======================================================
     ATIVIDADE
  ======================================================= */

  if (
    currentRecordType ===
    "activity"
  ) {

    const activity =
      document.getElementById(
        "activityType"
      );

    const duration =
      document.getElementById(
        "duration"
      );

    const intensity =
      document.getElementById(
        "intensity"
      );

    const note =
      document.getElementById(
        "activityNote"
      );


    record.activity =
      activity
        ? activity.value
        : "";

    record.duration =
      duration
        ? duration.value
        : "";

    record.intensity =
      intensity
        ? intensity.value
        : "";

    record.note =
      note
        ? note.value.trim()
        : "";
  }


  /* =======================================================
     CONSULTA
  ======================================================= */

  if (
    currentRecordType ===
    "consultation"
  ) {

    const professional =
      document.getElementById(
        "consultationProfessional"
      );

    const specialty =
      document.getElementById(
        "consultationSpecialty"
      );

    const location =
      document.getElementById(
        "consultationLocation"
      );

    const reason =
      document.getElementById(
        "consultationReason"
      );

    const note =
      document.getElementById(
        "consultationNote"
      );


    record.professional =
      professional
        ? professional.value.trim()
        : "";

    record.specialty =
      specialty
        ? specialty.value.trim()
        : "";

    record.location =
      location
        ? location.value.trim()
        : "";

    record.reason =
      reason
        ? reason.value.trim()
        : "";

    record.note =
      note
        ? note.value.trim()
        : "";
  }


  /* =======================================================
     EDITAR OU CRIAR
  ======================================================= */

  if (editingId) {

    const index =
      database.records.findIndex(
        item =>
          item.id ===
          editingId
      );


    if (index !== -1) {

      database.records[index] = {

        ...database.records[index],

        ...record
      };
    }

  } else {

    record.createdAt =
      new Date().toISOString();

    database.records.push(
      record
    );
  }


  saveDatabase();


  if (modal) {

    if (
      typeof modal.close ===
      "function"
    ) {

      modal.close();

    } else {

      modal.removeAttribute(
        "open"
      );
    }
  }


  editingId =
    null;

  currentRecordType =
    null;


  renderDashboard();

  renderDiary();

  renderConsultations();
}


/* =========================================================
   CONFIGURAR FORMULÁRIO
========================================================= */

function initializeForm() {

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    handleRecordSubmit
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


  if (!record) {
    return;
  }


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


    if (
      medication &&
      typeof openEditMedicationForm ===
        "function"
    ) {

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


  if (!record) {
    return;
  }


  const confirmed =
    confirm(
      "Mover este registro para a lixeira?"
    );


  if (!confirmed) {
    return;
  }


  database.trash.push({

    ...record,

    deletedAt:
      new Date().toISOString()
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


    if (!timeline) {
      return;
    }


    container =
      document.createElement(
        "div"
      );

    container.id =
      "consultationsHomePanel";

    container.className =
      "home-panel";


    if (
      timeline.parentNode
    ) {

      timeline.parentNode.insertBefore(
        container,
        timeline.nextSibling
      );
    }
  }


  const dateKey =
    formatDateKey(
      selectedDate
    );


  const todayConsultations =
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


  if (
    todayConsultations.length ===
    0
  ) {

    container.innerHTML =
      "";

    return;
  }


  container.innerHTML = `

    <div class="panel-header">

      <h3>
        🩺 Consultas do Dia
      </h3>

    </div>

    <div class="panel-content">

      ${
        todayConsultations
          .map(
            consultation => `

              <div class="consultation-card">

                <strong>

                  ${escapeHTML(
                    consultation.time
                  )}

                  -

                  ${escapeHTML(
                    consultation.specialty ||
                    "Consulta"
                  )}

                </strong>

                <p>
                  ${escapeHTML(
                    consultation.professional ||
                    ""
                  )}
                </p>

                ${
                  consultation.location
                    ? `
                      <small>
                        📍
                        ${escapeHTML(
                          consultation.location
                        )}
                      </small>
                    `
                    : ""
                }

              </div>

            `
          )
          .join("")
      }

    </div>
  `;
}


/* =========================================================
   CONSULTAS — TELA DEDICADA
========================================================= */

function renderConsultations() {

  const container =
    document.getElementById(
      "consultationsList"
    );


  if (!container) {
    return;
  }


  const consultations =
    database.records

      .filter(
        record =>
          record.type ===
          "consultation"
      )

      .sort(
        (a, b) =>
          (
            String(
              b.date || ""
            ) +
            String(
              b.time || ""
            )
          ).localeCompare(
            String(
              a.date || ""
            ) +
            String(
              a.time || ""
            )
          )
      );


  if (
    consultations.length ===
    0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        Nenhuma consulta
        agendada ou registrada.

      </div>

    `;

    return;
  }


  container.innerHTML =
    consultations
      .map(
        consultation => `

          <div class="card">

            <div class="card-header">

              <strong>

                ${escapeHTML(
                  consultation.date
                )}

                às

                ${escapeHTML(
                  consultation.time
                )}

              </strong>

              <span>

                ${escapeHTML(
                  consultation.specialty ||
                  "Consulta"
                )}

              </span>

            </div>


            <div class="card-body">

              <p>

                <strong>
                  Profissional:
                </strong>

                ${escapeHTML(
                  consultation.professional ||
                  ""
                )}

              </p>


              ${
                consultation.location
                  ? `
                    <p>

                      <strong>
                        Local:
                      </strong>

                      ${escapeHTML(
                        consultation.location
                      )}

                    </p>
                  `
                  : ""
              }


              ${
                consultation.reason
                  ? `
                    <p>

                      <strong>
                        Motivo:
                      </strong>

                      ${escapeHTML(
                        consultation.reason
                      )}

                    </p>
                  `
                  : ""
              }


              ${
                consultation.note
                  ? `
                    <p>

                      <strong>
                        Obs:
                      </strong>

                      ${escapeHTML(
                        consultation.note
                      )}

                    </p>
                  `
                  : ""
              }

            </div>


            <div class="card-actions">

              <button
                type="button"
                onclick="editRecord('${escapeHTML(
                  consultation.id
                )}')"
              >
                ✏️ Editar
              </button>


              <button
                type="button"
                onclick="deleteRecord('${escapeHTML(
                  consultation.id
                )}')"
              >
                🗑️ Excluir
              </button>

            </div>

          </div>

        `
      )
      .join("");
}


/* =========================================================
   MEDICAMENTOS NA HOME
========================================================= */

function renderMedicationHome() {

  const container =
    document.getElementById(
      "medicationHomePanel"
    );


  if (!container) {
    return;
  }


  if (
    medications.length ===
    0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        Nenhum medicamento cadastrado.

      </div>

    `;

    return;
  }


  const dateKey =
    formatDateKey(
      selectedDate
    );


  const todayMedRecords =
    database.records.filter(
      record =>
        record.type ===
          "medication" &&
        record.date ===
          dateKey
    );


  container.innerHTML =
    medications
      .map(
        medication => {

          const taken =
            todayMedRecords.some(
              record =>
                record.medicationId ===
                medication.id
            );


          return `

            <div
              class="med-item ${
                taken
                  ? "taken"
                  : ""
              }"
            >

              <div>

                <strong>

                  ${escapeHTML(
                    medication.name ||
                    "Medicamento"
                  )}

                </strong>

                <small>

                  ${escapeHTML(
                    medication.dosage ||
                    ""
                  )}

                </small>

              </div>


              <button
                type="button"
                onclick="toggleMedicationTaken('${escapeHTML(
                  medication.id
                )}')"
              >

                ${
                  taken
                    ? "✅ Tomado"
                    : "⚪ Tomar"
                }

              </button>

            </div>

          `;
        }
      )
      .join("");
}


/* =========================================================
   MARCAR MEDICAMENTO COMO TOMADO
========================================================= */

function toggleMedicationTaken(
  medId
) {

  const dateKey =
    formatDateKey(
      selectedDate
    );


  const existingIndex =
    database.records.findIndex(
      record =>
        record.type ===
          "medication" &&
        record.date ===
          dateKey &&
        record.medicationId ===
          medId
    );


  if (
    existingIndex !==
    -1
  ) {

    const existing =
      database.records[
        existingIndex
      ];


    database.trash.push({

      ...existing,

      deletedAt:
        new Date().toISOString()
    });


    database.records.splice(
      existingIndex,
      1
    );

  } else {

    const medication =
      medications.find(
        item =>
          item.id ===
          medId
      );


    database.records.push({

      id:
        generateId(),

      type:
        "medication",

      medicationId:
        medId,

      medicationName:
        medication
          ? medication.name
          : "Medicamento",

      date:
        dateKey,

      time:
        currentTime(),

      createdAt:
        new Date().toISOString()
    });
  }


  saveDatabase();


  renderDashboard();

  renderDiary();
}


/* =========================================================
   DIÁRIO / HISTÓRICO
========================================================= */

function renderDiary() {

  const container =
    document.getElementById(
      "diaryList"
    );


  if (!container) {
    return;
  }


  const records =
    getTodayRecords();


  if (
    records.length ===
    0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        Sem registros para o
        dia selecionado.

      </div>

    `;

    return;
  }


  container.innerHTML =
    records
      .map(
        createTimelineItem
      )
      .join("");
}


/* =========================================================
   TELA MAIS
========================================================= */

function renderMoreScreen() {

  renderTrash();
}


/* =========================================================
   LIXEIRA
========================================================= */

function renderTrash() {

  const container =
    document.getElementById(
      "trashList"
    );


  if (!container) {
    return;
  }


  if (
    database.trash.length ===
    0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        Lixeira vazia.

      </div>

    `;

    return;
  }


  container.innerHTML =
    database.trash
      .map(
        item => `

          <div class="trash-item">

            <div>

              <strong>

                ${escapeHTML(
                  item.type
                )}

                -

                ${escapeHTML(
                  item.date
                )}

              </strong>


              <small>

                Excluído em:

                ${new Date(
                  item.deletedAt
                ).toLocaleString(
                  "pt-BR"
                )}

              </small>

            </div>


            <button
              type="button"
              onclick="restoreFromTrash('${escapeHTML(
                item.id
              )}')"
            >

              🔄 Restaurar

            </button>

          </div>

        `
      )
      .join("");
}


/* =========================================================
   RESTAURAR DA LIXEIRA
========================================================= */

function restoreFromTrash(
  id
) {

  const itemIndex =
    database.trash.findIndex(
      item =>
        item.id === id
    );


  if (
    itemIndex ===
    -1
  ) {

    return;
  }


  const item =
    database.trash.splice(
      itemIndex,
      1
    )[0];


  delete item.deletedAt;


  database.records.push(
    item
  );


  saveDatabase();


  renderDashboard();

  renderDiary();

  renderTrash();

  renderConsultations();
}


/* =========================================================
   ESVAZIAR LIXEIRA
========================================================= */

function emptyTrash() {

  if (
    database.trash.length ===
    0
  ) {

    return;
  }


  const confirmed =
    confirm(
      "Tem certeza que deseja apagar permanentemente todos os itens da lixeira?"
    );


  if (!confirmed) {
    return;
  }


  database.trash = [];


  saveDatabase();


  renderTrash();
}


/* =========================================================
   BACKUP
========================================================= */

function exportBackup() {

  const data = {

    database:

      database,

    glucoseSettings:

      glucoseSettings,

    medications:

      medications,

    exportedAt:

      new Date().toISOString()
  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
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


  const a =
    document.createElement(
      "a"
    );


  a.href =
    url;


  a.download =
    `backup_recordatorio_${formatDateKey(
      new Date()
    )}.json`;


  document.body.appendChild(
    a
  );


  a.click();


  document.body.removeChild(
    a
  );


  setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );
}


/* =========================================================
   RESTAURAR BACKUP
========================================================= */

function importBackup(
  event
) {

  if (
    !event ||
    !event.target
  ) {

    return;
  }


  const file =
    event.target.files &&
    event.target.files[0];


  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      try {

        const data =
          JSON.parse(
            e.target.result
          );


        if (
          data.database &&
          typeof data.database ===
            "object"
        ) {

          database = {

            records:
              Array.isArray(
                data.database.records
              )
                ? data.database.records
                : [],

            trash:
              Array.isArray(
                data.database.trash
              )
                ? data.database.trash
                : []
          };


          saveDatabase();
        }


        if (
          data.glucoseSettings &&
          typeof data.glucoseSettings ===
            "object"
        ) {

          glucoseSettings = {

            ...defaultGlucoseOptions,

            ...data.glucoseSettings
          };


          saveGlucoseSettings();
        }


        if (
          Array.isArray(
            data.medications
          )
        ) {

          medications =
            data.medications;

          saveMedications();
        }


        alert(
          "Backup restaurado com sucesso!"
        );


        renderDashboard();

        renderDiary();

        renderConsultations();

        renderTrash();


      } catch (error) {

        alert(
          "Erro ao importar o arquivo de backup."
        );


        console.error(
          "Erro no backup:",
          error
        );
      }


      event.target.value =
        "";
    };


  reader.onerror =
    function(error) {

      console.error(
        "Erro ao ler arquivo:",
        error
      );


      alert(
        "Não foi possível ler o arquivo de backup."
      );


      event.target.value =
        "";
    };


  reader.readAsText(
    file
  );
}


/* =========================================================
   NAVEGAÇÃO DE DATA
========================================================= */

function changeSelectedDate(
  days
) {

  selectedDate =
    new Date(
      selectedDate
    );


  selectedDate.setDate(
    selectedDate.getDate() +
    Number(days || 0)
  );


  renderDashboard();

  renderDiary();
}


function goToToday() {

  selectedDate =
    new Date();


  renderDashboard();

  renderDiary();
}


/* =========================================================
   FUNÇÕES DE CONVENIÊNCIA
========================================================= */

function previousDay() {

  changeSelectedDate(
    -1
  );
}


function nextDay() {

  changeSelectedDate(
    1
  );
}


/* =========================================================
   EVENTOS DE NAVEGAÇÃO
========================================================= */

function initializeNavigation() {

  const navigationItems =
    document.querySelectorAll(
      ".navigation-item"
    );


  navigationItems.forEach(
    item => {

      item.addEventListener(
        "click",
        function() {

          const target =
            item.dataset.screen;


          if (target) {

            showScreen(
              target
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   EXPOR FUNÇÕES PARA O HTML
   NECESSÁRIO QUANDO O HTML USA onclick=""
========================================================= */

window.showScreen =
  showScreen;

window.openRecordForm =
  openRecordForm;

window.openConsultationsScreen =
  openConsultationsScreen;

window.editRecord =
  editRecord;

window.deleteRecord =
  deleteRecord;

window.toggleMedicationTaken =
  toggleMedicationTaken;

window.restoreFromTrash =
  restoreFromTrash;

window.emptyTrash =
  emptyTrash;

window.exportBackup =
  exportBackup;

window.importBackup =
  importBackup;

window.changeSelectedDate =
  changeSelectedDate;

window.previousDay =
  previousDay;

window.nextDay =
  nextDay;

window.goToToday =
  goToToday;

window.renderDashboard =
  renderDashboard;

window.renderDiary =
  renderDiary;

window.renderConsultations =
  renderConsultations;


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    initializeElements();

    initializeForm();

    initializeNavigation();

    renderDashboard();

    renderDiary();

    renderConsultations();

    renderMoreScreen();

  }
);
