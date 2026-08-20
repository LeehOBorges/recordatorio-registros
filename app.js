/* =========================================================
   RECORDATÓRIO + REGISTROS
   VERSÃO 0.2 — INTEGRAÇÃO SUPABASE + LOCALSTORAGE
   REFEIÇÕES / GLICEMIA / INSULINA / ATIVIDADE
   MEDICAMENTOS / SUPLEMENTOS / VITAMINAS / CONSULTAS
   ÁGUA / DIÁRIO / LIXEIRA / CONFIGURAÇÕES / BACKUP
========================================================= */

const STORAGE_KEY = "recordatorio_registros_v01";
const GLUCOSE_SETTINGS_KEY = "recordatorio_glicemia_config_v01";
const MEDICATION_SETTINGS_KEY = "recordatorio_medicamentos_config_v01";
const WATER_SETTINGS_KEY = "recordatorio_agua_config_v01";
const MIGRATION_FLAG_KEY = "recordatorio_supabase_migrated";
const WATER_RECORD_TYPE = "water";

/* =========================================================
   CONFIGURAÇÕES PADRÃO
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

const defaultWaterSettings = {
  dailyGoal: 2000
};

/* =========================================================
   ESTADO DA APLICAÇÃO
========================================================= */

let currentUser = null;
let database = loadDatabase();
let glucoseSettings = loadGlucoseSettings();
let medications = loadMedications();
let waterSettings = loadWaterSettings();

let selectedDate = new Date();
let editingId = null;
let currentRecordType = null;

/* =========================================================
   SUPABASE CLIENT & AUTENTICAÇÃO
========================================================= */

const supabaseUrl = window.SUPABASE_URL || "https://seu-projeto.supabase.co";
const supabaseAnonKey = window.SUPABASE_ANON_KEY || "sua-chave-anonima";
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

async function checkAndInitUser() {
  if (!supabase) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      currentUser = null;
      return null;
    }
    currentUser = user;
    await handleUserAuthenticated();
    return user;
  } catch (err) {
    console.error("Erro ao verificar autenticação via getUser():", err);
    return null;
  }
}

async function loginWithSupabase(email, password) {
  if (!supabase) return { error: { message: "Cliente Supabase não inicializado." } };
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (!error && data.user) {
    currentUser = data.user;
    await handleUserAuthenticated();
  }

  return { data, error };
}

async function handleUserAuthenticated() {
  if (!currentUser) return;
  
  await checkAndRunMigration();
  await syncAllDataFromSupabase();
  
  renderDashboard();
  renderDiary();
  renderTrash();
  renderConsultations();
}

/* =========================================================
   MIGRAÇÃO ÚNICA DO LOCALSTORAGE -> SUPABASE
========================================================= */

async function checkAndRunMigration() {
  if (!currentUser || !supabase) return;

  const migrationDone = localStorage.getItem(`${MIGRATION_FLAG_KEY}_${currentUser.id}`);
  if (migrationDone === "true") return;

  try {
    // 1. Migrar registros
    if (database.records && database.records.length > 0) {
      const recordsToInsert = database.records.map(rec => ({
        ...rec,
        user_id: currentUser.id,
        is_trash: false
      }));

      await supabase.from("records").upsert(recordsToInsert, { onConflict: "id" });
    }

    // 2. Migrar lixeira
    if (database.trash && database.trash.length > 0) {
      const trashToInsert = database.trash.map(item => ({
        ...item,
        user_id: currentUser.id,
        is_trash: true
      }));

      await supabase.from("records").upsert(trashToInsert, { onConflict: "id" });
    }

    // 3. Migrar medicamentos
    if (medications && medications.length > 0) {
      const medsToInsert = medications.map(med => ({
        ...med,
        user_id: currentUser.id
      }));

      await supabase.from("medications").upsert(medsToInsert, { onConflict: "id" });
    }

    // 4. Migrar configurações de glicemia e água
    await supabase.from("user_settings").upsert({
      user_id: currentUser.id,
      glucose_settings: glucoseSettings,
      water_settings: waterSettings,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    localStorage.setItem(`${MIGRATION_FLAG_KEY}_${currentUser.id}`, "true");
    console.log("Migração do localStorage para Supabase concluída com sucesso.");
  } catch (err) {
    console.error("Erro durante a migração para o Supabase:", err);
  }
}

/* =========================================================
   SINCRONIZAÇÃO COMPLETA (CARREGAR APENAS DADOS DO USUÁRIO)
========================================================= */

async function syncAllDataFromSupabase() {
  if (!currentUser || !supabase) return;

  try {
    // Carregar registros ativos e lixeira
    const { data: recordsData, error: recordsErr } = await supabase
      .from("records")
      .select("*")
      .eq("user_id", currentUser.id);

    if (!recordsErr && recordsData) {
      database.records = recordsData.filter(r => !r.is_trash);
      database.trash = recordsData.filter(r => r.is_trash);
      saveDatabase();
    }

    // Carregar medicamentos
    const { data: medsData, error: medsErr } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", currentUser.id);

    if (!medsErr && medsData) {
      medications = medsData;
      saveMedications();
    }

    // Carregar configurações
    const { data: settingsData, error: settingsErr } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (!settingsErr && settingsData) {
      if (settingsData.glucose_settings) {
        glucoseSettings = { ...defaultGlucoseOptions, ...settingsData.glucose_settings };
        saveGlucoseSettings();
      }
      if (settingsData.water_settings) {
        waterSettings = { ...defaultWaterSettings, ...settingsData.water_settings };
        saveWaterSettings();
      }
    }
  } catch (err) {
    console.error("Erro ao sincronizar dados do Supabase:", err);
  }
}

/* =========================================================
   BANCO DE DADOS LOCAL
========================================================= */

function loadDatabase() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { records: [], trash: [] };
    const parsed = JSON.parse(stored);
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      trash: Array.isArray(parsed.trash) ? parsed.trash : []
    };
  } catch (error) {
    console.error("Erro ao carregar banco:", error);
    return { records: [], trash: [] };
  }
}

function saveDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

async function syncRecordToSupabase(record, isTrash = false) {
  if (!currentUser || !supabase) return;
  try {
    const payload = {
      ...record,
      user_id: currentUser.id,
      is_trash: isTrash
    };
    await supabase.from("records").upsert(payload, { onConflict: "id" });
  } catch (err) {
    console.error("Erro ao sincronizar registro com o Supabase:", err);
  }
}

async function deleteRecordFromSupabase(id) {
  if (!currentUser || !supabase) return;
  try {
    await supabase.from("records").delete().eq("id", id).eq("user_id", currentUser.id);
  } catch (err) {
    console.error("Erro ao excluir registro do Supabase:", err);
  }
}

async function emptyTrashFromSupabase() {
  if (!currentUser || !supabase) return;
  try {
    await supabase.from("records").delete().eq("user_id", currentUser.id).eq("is_trash", true);
  } catch (err) {
    console.error("Erro ao esvaziar lixeira no Supabase:", err);
  }
}

/* =========================================================
   CONFIGURAÇÃO DE GLICEMIA
========================================================= */

function loadGlucoseSettings() {
  try {
    const stored = localStorage.getItem(GLUCOSE_SETTINGS_KEY);
    if (!stored) return { ...defaultGlucoseOptions };
    const parsed = JSON.parse(stored);
    return {
      ...defaultGlucoseOptions,
      ...(parsed && typeof parsed === "object" ? parsed : {})
    };
  } catch (error) {
    console.error("Erro ao carregar configurações de glicemia:", error);
    return { ...defaultGlucoseOptions };
  }
}

function saveGlucoseSettings() {
  localStorage.setItem(GLUCOSE_SETTINGS_KEY, JSON.stringify(glucoseSettings));
  syncUserSettingsToSupabase();
}

/* =========================================================
   MEDICAMENTOS / SUPLEMENTOS / VITAMINAS
========================================================= */

function loadMedications() {
  try {
    const stored = localStorage.getItem(MEDICATION_SETTINGS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Erro ao carregar medicamentos:", error);
    return [];
  }
}

function saveMedications() {
  localStorage.setItem(MEDICATION_SETTINGS_KEY, JSON.stringify(medications));
}

async function syncMedicationToSupabase(medication) {
  if (!currentUser || !supabase) return;
  try {
    await supabase.from("medications").upsert({
      ...medication,
      user_id: currentUser.id
    }, { onConflict: "id" });
  } catch (err) {
    console.error("Erro ao sincronizar medicamento com o Supabase:", err);
  }
}

async function deleteMedicationFromSupabase(id) {
  if (!currentUser || !supabase) return;
  try {
    await supabase.from("medications").delete().eq("id", id).eq("user_id", currentUser.id);
  } catch (err) {
    console.error("Erro ao deletar medicamento do Supabase:", err);
  }
}

function generateMedicationId() {
  return "med_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2);
}

/* =========================================================
   ÁGUA — CONFIGURAÇÃO
========================================================= */

function loadWaterSettings() {
  try {
    const stored = localStorage.getItem(WATER_SETTINGS_KEY);
    if (!stored) return { ...defaultWaterSettings };
    const parsed = JSON.parse(stored);
    return {
      ...defaultWaterSettings,
      ...(parsed && typeof parsed === "object" ? parsed : {})
    };
  } catch (error) {
    console.error("Erro ao carregar configuração de água:", error);
    return { ...defaultWaterSettings };
  }
}

function saveWaterSettings() {
  localStorage.setItem(WATER_SETTINGS_KEY, JSON.stringify(waterSettings));
  syncUserSettingsToSupabase();
}

async function syncUserSettingsToSupabase() {
  if (!currentUser || !supabase) return;
  try {
    await supabase.from("user_settings").upsert({
      user_id: currentUser.id,
      glucose_settings: glucoseSettings,
      water_settings: waterSettings,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  } catch (err) {
    console.error("Erro ao sincronizar configurações:", err);
  }
}

/* =========================================================
   ELEMENTOS
========================================================= */

const modal = document.getElementById("recordModal");
const form = document.getElementById("recordForm");
const formFields = document.getElementById("formFields");
const modalTitle = document.getElementById("modalTitle");

/* =========================================================
   ID, DATAS E SEGURANÇA
========================================================= */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });
}

function currentTime() {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   DATA NO CABEÇALHO E REGISTROS DO DIA
========================================================= */

function renderDate() {
  const element = document.getElementById("currentDate");
  if (!element) return;
  element.textContent = formatDisplayDate(selectedDate);
}

function getTodayRecords() {
  const dateKey = formatDateKey(selectedDate);
  return database.records
    .filter(record => record.date === dateKey)
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

/* =========================================================
   NAVEGAR ENTRE TELAS
========================================================= */

function showScreen(targetScreen) {
  if (!targetScreen) return;

  const screens = document.querySelectorAll(".app-screen");
  screens.forEach(screen => {
    screen.hidden = screen.id !== targetScreen;
  });

  const navigationItems = document.querySelectorAll(".navigation-item");
  navigationItems.forEach(item => {
    item.classList.toggle("active", item.dataset.screen === targetScreen);
  });

  if (targetScreen === "todayScreen") renderDashboard();
  if (targetScreen === "diaryScreen") renderDiary();
  if (targetScreen === "consultationScreen") renderConsultations();
  if (targetScreen === "moreScreen") renderMoreScreen();
}

function openConsultationsScreen() {
  showScreen("consultationScreen");
  renderConsultations();
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  renderDate();

  const records = getTodayRecords();
  const meals = records.filter(record => record.type === "meal");
  const glucose = records.filter(record => record.type === "glucose");
  const insulin = records.filter(record => record.type === "insulin");
  const activities = records.filter(record => record.type === "activity");

  const mealCount = document.getElementById("mealCount");
  if (mealCount) mealCount.textContent = meals.length;

  const glucoseCount = document.getElementById("glucoseCount");
  if (glucoseCount) glucoseCount.textContent = glucose.length;

  const insulinCount = document.getElementById("insulinCount");
  if (insulinCount) insulinCount.textContent = insulin.length;

  const totalMinutes = activities.reduce((total, record) => total + Number(record.duration || 0), 0);
  const activityTotal = document.getElementById("activityTotal");
  if (activityTotal) activityTotal.textContent = `${totalMinutes} min`;

  renderTimeline(records);
  renderMedicationHome();
  renderWaterHome();
}

/* =========================================================
   LINHA DO TEMPO
========================================================= */

function renderTimeline(records) {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;

  if (records.length === 0) {
    timeline.innerHTML = `
      <div class="empty-state">
        Nenhum registro neste dia.<br><br>
        Use os botões acima para começar.
      </div>
    `;
    return;
  }

  timeline.innerHTML = records
    .filter(record => record.type !== WATER_RECORD_TYPE)
    .map(createTimelineItem)
    .join("");

  if (timeline.innerHTML.trim() === "") {
    timeline.innerHTML = `
      <div class="empty-state">
        Nenhum registro neste dia.<br><br>
        Use os botões acima para começar.
      </div>
    `;
  }
}

function createTimelineItem(record) {
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

  if (record.type === "meal") {
    title = record.mealType || "Refeição";
    detail = record.food || "Refeição registrada";
    if (record.quantity) detail += ` · ${record.quantity}`;
  } else if (record.type === "glucose") {
    title = `${record.value} mg/dL`;
    detail = record.kind || "Glicemia";
  } else if (record.type === "insulin") {
    title = `${record.dose} U`;
    detail = record.insulin || "Insulina";
    if (record.application) detail += ` · ${record.application}`;
  } else if (record.type === "activity") {
    title = record.activity || "Atividade";
    detail = `${record.duration || 0} min`;
    if (record.intensity) detail += ` · ${record.intensity}`;
  } else if (record.type === "medication") {
    title = record.medicationName || "Medicamento / suplemento / vitamina";
    detail = "Tomado";
    if (record.period) {
      const periodLabels = { morning: "Manhã", afternoon: "Tarde", night: "Noite" };
      detail += ` · ${periodLabels[record.period] || record.period}`;
    }
  } else if (record.type === "consultation") {
    title = record.specialty || "Consulta";
    detail = record.professional || "Consulta médica";
    if (record.location) detail += ` · ${record.location}`;
  }

  return `
    <div class="timeline-item">
      <div class="timeline-icon">
        ${icons[record.type] || "📝"}
      </div>

      <div class="timeline-content">
        <div class="timeline-title">
          ${escapeHTML(record.time)} · ${escapeHTML(title)}
        </div>

        <div class="timeline-detail">
          ${escapeHTML(detail)}
        </div>
      </div>

      <div class="timeline-actions">
        <button type="button" onclick="editRecord('${escapeHTML(record.id)}')" title="Editar">
          ✏️
        </button>

        <button type="button" onclick="deleteRecord('${escapeHTML(record.id)}')" title="Excluir">
          🗑️
        </button>
      </div>
    </div>
  `;
}

/* =========================================================
   OPÇÕES DE GLICEMIA E FORMULÁRIO
========================================================= */

function getGlucoseOptions(record = null) {
  const definitions = [
    ["fasting", "Jejum"],
    ["breakfast1", "1h após o café da manhã"],
    ["breakfast2", "2h após o café da manhã"],
    ["morningSnack1", "1h após o lanche da manhã"],
    ["morningSnack2", "2h após o lanche da manhã"],
    ["lunch1", "1h após o almoço"],
    ["lunch2", "2h após o almoço"],
    ["afternoonSnack1", "1h após o lanche da tarde"],
    ["afternoonSnack2", "2h após o lanche da tarde"],
    ["dinner1", "1h após o jantar"],
    ["dinner2", "2h após o jantar"],
    ["supper1", "1h após a ceia"],
    ["supper2", "2h após a ceia"]
  ];

  const options = definitions
    .filter(item => glucoseSettings[item[0]])
    .map(item => ({ value: item[1], label: item[1] }));

  if (record && record.kind && !options.some(opt => opt.value === record.kind)) {
    options.unshift({ value: record.kind, label: record.kind });
  }

  return options;
}

function openRecordForm(type, record = null) {
  currentRecordType = type;
  editingId = record ? record.id : null;

  const titles = {
    meal: record ? "Editar refeição" : "Nova refeição",
    glucose: record ? "Editar glicemia" : "Nova glicemia",
    insulin: record ? "Editar insulina" : "Nova aplicação",
    activity: record ? "Editar atividade" : "Nova atividade",
    consultation: record ? "Editar consulta" : "Nova consulta"
  };

  if (modalTitle) modalTitle.textContent = titles[type];

  const date = record ? record.date : formatDateKey(selectedDate);
  const time = record ? record.time : currentTime();

  let html = `
    <div class="form-group">
      <label for="recordDate">Data</label>
      <input id="recordDate" type="date" value="${escapeHTML(date)}" required>
    </div>

    <div class="form-group">
      <label for="recordTime">Horário</label>
      <input id="recordTime" type="time" value="${escapeHTML(time)}" required>
    </div>
  `;

  if (type === "meal") {
    html += `
      <div class="form-group">
        <label for="mealType">Tipo de refeição</label>
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
        <label for="food">Alimentos consumidos</label>
        <input id="food" type="text" placeholder="Ex.: arroz, feijão, frango e salada">
      </div>

      <div class="form-group">
        <label for="quantity">Quantidade</label>
        <input id="quantity" type="text" placeholder="Ex.: 100 g, 2 unidades">
      </div>

      <div class="form-group">
        <label for="note">Observação</label>
        <textarea id="note" placeholder="Opcional"></textarea>
      </div>
    `;
  }

  if (type === "glucose") {
    const options = getGlucoseOptions(record);
    const optionsHTML = options
      .map(opt => `
        <option value="${escapeHTML(opt.value)}" ${record && record.kind === opt.value ? "selected" : ""}>
          ${escapeHTML(opt.label)}
        </option>
      `)
      .join("");

    html += `
      <div class="form-group">
        <label for="glucoseValue">Glicemia (mg/dL)</label>
        <input id="glucoseValue" type="number" min="0" step="1" required>
      </div>

      <div class="form-group">
        <label for="glucoseKind">Momento da medição</label>
        <select id="glucoseKind">${optionsHTML}</select>
      </div>

      <div class="form-group">
        <label for="glucoseNote">Observação</label>
        <textarea id="glucoseNote" placeholder="Opcional"></textarea>
      </div>
    `;
  }

  if (type === "insulin") {
    html += `
      <div class="form-group">
        <label for="insulinName">Insulina</label>
        <input id="insulinName" type="text" value="Novolin N">
      </div>

      <div class="form-group">
        <label for="insulinDose">Dose (unidades)</label>
        <input id="insulinDose" type="number" min="0" step="1" required>
      </div>

      <div class="form-group">
        <label for="application">Aplicação</label>
        <select id="application">
          <option>Em jejum</option>
          <option>Antes do almoço</option>
          <option>À noite</option>
          <option>Outra</option>
        </select>
      </div>

      <div class="form-group">
        <label for="insulinNote">Observação</label>
        <textarea id="insulinNote" placeholder="Opcional"></textarea>
      </div>
    `;
  }

  if (type === "activity") {
    html += `
      <div class="form-group">
        <label for="activityType">Atividade</label>
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
        <label for="duration">Duração (minutos)</label>
        <input id="duration" type="number" min="0" required>
      </div>

      <div class="form-group">
        <label for="intensity">Intensidade</label>
        <select id="intensity">
          <option>Leve</option>
          <option>Moderada</option>
          <option>Intensa</option>
        </select>
      </div>

      <div class="form-group">
        <label for="activityNote">Observação</label>
        <textarea id="activityNote" placeholder="Opcional"></textarea>
      </div>
    `;
  }

  if (type === "consultation") {
    html += `
      <div class="form-group">
        <label for="consultationProfessional">Profissional</label>
        <input id="consultationProfessional" type="text" placeholder="Ex.: Dra. Maria Silva" required>
      </div>

      <div class="form-group">
        <label for="consultationSpecialty">Especialidade</label>
        <input id="consultationSpecialty" type="text" placeholder="Ex.: Obstetra" required>
      </div>

      <div class="form-group">
        <label for="consultationLocation">Local</label>
        <input id="consultationLocation" type="text" placeholder="Ex.: Clínica / consultório / hospital">
      </div>

      <div class="form-group">
        <label for="consultationReason">Motivo da consulta</label>
        <input id="consultationReason" type="text" placeholder="Ex.: Consulta de acompanhamento">
      </div>

      <div class="form-group">
        <label for="consultationNote">Observações</label>
        <textarea id="consultationNote" placeholder="Anote informações importantes, orientações, pedidos de exames etc."></textarea>
      </div>
    `;
  }

  if (formFields) formFields.innerHTML = html;
  if (record) fillEditFields(record);
  if (modal) modal.showModal();
}

function fillEditFields(record) {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  setValue("recordDate", record.date);
  setValue("recordTime", record.time);
  setValue("mealType", record.mealType);
  setValue("food", record.food);
  setValue("quantity", record.quantity);
  setValue("note", record.note);
  setValue("glucoseValue", record.value);
  setValue("glucoseKind", record.kind);
  setValue("glucoseNote", record.note);
  setValue("insulinName", record.insulin);
  setValue("insulinDose", record.dose);
  setValue("application", record.application);
  setValue("insulinNote", record.note);
  setValue("activityType", record.activity);
  setValue("duration", record.duration);
  setValue("intensity", record.intensity);
  setValue("activityNote", record.note);
  setValue("consultationProfessional", record.professional);
  setValue("consultationSpecialty", record.specialty);
  setValue("consultationLocation", record.location);
  setValue("consultationReason", record.reason);
  setValue("consultationNote", record.note);
}

/* =========================================================
   SALVAR REGISTRO
========================================================= */

if (form) {
  form.addEventListener("submit", function(event) {
    event.preventDefault();

    const dateElement = document.getElementById("recordDate");
    const timeElement = document.getElementById("recordTime");
    if (!dateElement || !timeElement) return;

    const record = {
      id: editingId || generateId(),
      type: currentRecordType,
      date: dateElement.value,
      time: timeElement.value,
      updatedAt: new Date().toISOString()
    };

    if (currentRecordType === "meal") {
      record.mealType = document.getElementById("mealType").value;
      record.food = document.getElementById("food").value.trim();
      record.quantity = document.getElementById("quantity").value.trim();
      record.note = document.getElementById("note").value.trim();
    }

    if (currentRecordType === "glucose") {
      record.value = document.getElementById("glucoseValue").value;
      record.kind = document.getElementById("glucoseKind").value;
      record.note = document.getElementById("glucoseNote").value.trim();
    }

    if (currentRecordType === "insulin") {
      record.insulin = document.getElementById("insulinName").value.trim();
      record.dose = document.getElementById("insulinDose").value;
      record.application = document.getElementById("application").value;
      record.note = document.getElementById("insulinNote").value.trim();
    }

    if (currentRecordType === "activity") {
      record.activity = document.getElementById("activityType").value;
      record.duration = document.getElementById("duration").value;
      record.intensity = document.getElementById("intensity").value;
      record.note = document.getElementById("activityNote").value.trim();
    }

    if (currentRecordType === "consultation") {
      record.professional = document.getElementById("consultationProfessional").value.trim();
      record.specialty = document.getElementById("consultationSpecialty").value.trim();
      record.location = document.getElementById("consultationLocation").value.trim();
      record.reason = document.getElementById("consultationReason").value.trim();
      record.note = document.getElementById("consultationNote").value.trim();
    }

    if (editingId) {
      const index = database.records.findIndex(item => item.id === editingId);
      if (index !== -1) {
        database.records[index] = { ...database.records[index], ...record };
      }
    } else {
      record.createdAt = new Date().toISOString();
      database.records.push(record);
    }

    saveDatabase();
    syncRecordToSupabase(record, false);

    if (modal) modal.close();

    editingId = null;
    currentRecordType = null;

    renderDashboard();
    renderDiary();
    renderConsultations();
  });
}

function editRecord(id) {
  const record = database.records.find(item => item.id === id);
  if (!record) return;

  if (record.type === "medication") {
    const medication = medications.find(item => item.id === record.medicationId);
    if (medication) openEditMedicationForm(medication.id);
    return;
  }

  openRecordForm(record.type, record);
}

function deleteRecord(id) {
  const record = database.records.find(item => item.id === id);
  if (!record) return;

  if (!confirm("Mover este registro para a lixeira?")) return;

  const trashedRecord = {
    ...record,
    deletedAt: new Date().toISOString()
  };

  database.trash.push(trashedRecord);
  database.records = database.records.filter(item => item.id !== id);

  saveDatabase();
  syncRecordToSupabase(trashedRecord, true);

  renderDashboard();
  renderDiary();
  renderTrash();
  renderConsultations();
}

/* =========================================================
   CONSULTAS
========================================================= */

function renderConsultationsHome() {
  let container = document.getElementById("consultationsHomePanel");

  if (!container) {
    const timeline = document.getElementById("timeline");
    if (!timeline) return;

    container = document.createElement("section");
    container.id = "consultationsHomePanel";
    container.className = "card";
    timeline.insertAdjacentElement("afterend", container);
  }

  const dateKey = formatDateKey(selectedDate);
  const consultations = database.records
    .filter(record => record.type === "consultation" && record.date === dateKey)
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

  let html = `
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <h2>🩺 Consultas</h2>
        <p>Consultas agendadas para este dia.</p>
      </div>
      <button type="button" id="addConsultationHomeButton" class="primary-button">+ Nova consulta</button>
    </div>
  `;

  if (consultations.length === 0) {
    html += `<div class="empty-state">Nenhuma consulta registrada para este dia.</div>`;
  } else {
    consultations.forEach(consultation => {
      html += createConsultationCard(consultation);
    });
  }

  container.innerHTML = html;

  const addButton = document.getElementById("addConsultationHomeButton");
  if (addButton) {
    addButton.addEventListener("click", () => openRecordForm("consultation"));
  }
}

function createConsultationCard(consultation) {
  return `
    <div class="card" style="margin-top:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
        <div>
          <strong>🩺 ${escapeHTML(consultation.time)} · ${escapeHTML(consultation.specialty || "Consulta")}</strong>
          <div style="margin-top:6px;">${escapeHTML(consultation.professional || "")}</div>
          ${consultation.location ? `<div style="margin-top:4px; opacity:.7;">📍 ${escapeHTML(consultation.location)}</div>` : ""}
          ${consultation.reason ? `<div style="margin-top:6px;">${escapeHTML(consultation.reason)}</div>` : ""}
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" onclick="editRecord('${escapeHTML(consultation.id)}')" title="Editar consulta">✏️</button>
          <button type="button" onclick="deleteRecord('${escapeHTML(consultation.id)}')" title="Excluir consulta">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function renderConsultations() {
  let container = document.getElementById("consultationsContent");

  if (!container) {
    const screen = document.getElementById("consultationScreen");
    if (!screen) return;

    container = document.createElement("div");
    container.id = "consultationsContent";
    screen.appendChild(container);
  }

  const consultations = database.records
    .filter(record => record.type === "consultation")
    .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));

  let html = `
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
      <div>
        <h2>🩺 Consultas</h2>
        <p>Acompanhe suas consultas e compromissos de saúde.</p>
      </div>
      <button type="button" id="newConsultationButton" class="primary-button">+ Nova consulta</button>
    </div>
  `;

  if (consultations.length === 0) {
    html += `
      <div class="empty-state">
        Nenhuma consulta cadastrada.<br><br>
        Cadastre sua primeira consulta para começar a organizar seus compromissos de saúde.
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">`;
    consultations.forEach(consultation => {
      html += `
        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:1.05rem;">
                🩺 ${escapeHTML(consultation.specialty || "Consulta")}
              </div>
              <div style="margin-top:8px;">
                📅 ${escapeHTML(consultation.date)} · ⏰ ${escapeHTML(consultation.time)}
              </div>
              ${consultation.professional ? `<div style="margin-top:6px;">👩‍⚕️ ${escapeHTML(consultation.professional)}</div>` : ""}
              ${consultation.location ? `<div style="margin-top:6px; opacity:.75;">📍 ${escapeHTML(consultation.location)}</div>` : ""}
              ${consultation.reason ? `<div style="margin-top:8px;"><strong>Motivo:</strong> ${escapeHTML(consultation.reason)}</div>` : ""}
              ${consultation.note ? `<div style="margin-top:8px;"><strong>Observações:</strong><div style="white-space:pre-wrap; margin-top:4px;">${escapeHTML(consultation.note)}</div></div>` : ""}
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button type="button" onclick="editRecord('${escapeHTML(consultation.id)}')" title="Editar">✏️</button>
              <button type="button" onclick="deleteRecord('${escapeHTML(consultation.id)}')" title="Excluir">🗑️</button>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  container.innerHTML = html;

  const newButton = document.getElementById("newConsultationButton");
  if (newButton) {
    newButton.addEventListener("click", () => openRecordForm("consultation"));
  }
}

/* =========================================================
   MEDICAMENTOS / SUPLEMENTOS / VITAMINAS
========================================================= */

function renderMedicationHome() {
  let container = document.getElementById("medicationHomePanel");
  if (container) {
    container.remove();
    container = null;
  }
}

function attachMedicationHomeEvents() {}

function isMedicationTaken(medicationId, dateKey) {
  return database.records.some(
    record =>
      record.type === "medication" &&
      record.medicationId === medicationId &&
      record.date === dateKey &&
      record.taken === true
  );
}

function toggleMedicationTaken(medicationId, checked) {
  const dateKey = formatDateKey(selectedDate);
  const medication = medications.find(item => item.id === medicationId);
  if (!medication) return;

  const existingIndex = database.records.findIndex(
    record =>
      record.type === "medication" &&
      record.medicationId === medicationId &&
      record.date === dateKey
  );

  if (checked) {
    const record = {
      id: existingIndex !== -1 ? database.records[existingIndex].id : generateId(),
      type: "medication",
      medicationId: medicationId,
      medicationName: medication.name,
      period: medication.period,
      date: dateKey,
      time: currentTime(),
      taken: true,
      createdAt: existingIndex !== -1
        ? (database.records[existingIndex].createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      database.records[existingIndex] = { ...database.records[existingIndex], ...record };
    } else {
      database.records.push(record);
    }

    saveDatabase();
    syncRecordToSupabase(record, false);
  } else {
    if (existingIndex !== -1) {
      const removedId = database.records[existingIndex].id;
      database.records.splice(existingIndex, 1);
      saveDatabase();
      deleteRecordFromSupabase(removedId);
    }
  }

  renderDashboard();
  renderDiary();
}

function openMedicationManager() {
  let manager = document.getElementById("medicationManager");
  if (!manager) {
    manager = document.createElement("dialog");
    manager.id = "medicationManager";
    document.body.appendChild(manager);
  }
  renderMedicationManager();
  manager.showModal();
}

function renderMedicationManager() {
  const manager = document.getElementById("medicationManager");
  if (!manager) return;

  manager.innerHTML = `
    <form method="dialog" style="padding:24px; min-width:min(90vw,520px); max-height:85vh; overflow:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <h2>💊 Medicamentos / Suplementos e Vitaminas</h2>
        <button type="submit" class="icon-button">✕</button>
      </div>

      <p>Cadastre cada item separadamente e escolha o período em que ele é tomado.</p>

      <button type="button" id="newMedicationButton" class="primary-button" style="margin:16px 0;">
        + Adicionar medicamento, suplemento ou vitamina
      </button>

      <div id="medicationList"></div>
    </form>
  `;

  const list = document.getElementById("medicationList");
  if (medications.length === 0) {
    list.innerHTML = `<div class="empty-state">Nenhum medicamento ou vitamina cadastrado.</div>`;
  } else {
    list.innerHTML = medications.map(createMedicationManagerItem).join("");
  }

  document.getElementById("newMedicationButton").addEventListener("click", openAddMedicationForm);

  manager.querySelectorAll("[data-edit-medication]").forEach(button => {
    button.addEventListener("click", () => openEditMedicationForm(button.dataset.editMedication));
  });

  manager.querySelectorAll("[data-delete-medication]").forEach(button => {
    button.addEventListener("click", () => deleteMedication(button.dataset.deleteMedication));
  });
}

function createMedicationManagerItem(medication) {
  const periodLabels = { morning: "Manhã", afternoon: "Tarde", night: "Noite" };

  return `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <strong>${escapeHTML(medication.name)}</strong>
          <div style="margin-top:4px; opacity:.7;">
            ${escapeHTML(periodLabels[medication.period] || medication.period)}
            ${medication.time ? ` · ${escapeHTML(medication.time)}` : ""}
          </div>
        </div>

        <div style="display:flex; gap:6px;">
          <button type="button" data-edit-medication="${escapeHTML(medication.id)}" title="Editar">✏️</button>
          <button type="button" data-delete-medication="${escapeHTML(medication.id)}" title="Excluir">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

function openAddMedicationForm() {
  renderMedicationForm();
}

function openEditMedicationForm(id) {
  const medication = medications.find(item => item.id === id);
  if (!medication) return;
  renderMedicationForm(medication);
}

function renderMedicationForm(medication = null) {
  const manager = document.getElementById("medicationManager");
  if (!manager) return;

  const isEditing = Boolean(medication);

  manager.innerHTML = `
    <form id="medicationForm" style="padding:24px; min-width:min(90vw,520px);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2>${isEditing ? "Editar medicamento / suplemento / vitamina" : "Novo medicamento / suplemento / vitamina"}</h2>
        <button type="button" id="closeMedicationForm" class="icon-button">✕</button>
      </div>

      <div class="form-group">
        <label for="medicationName">Nome</label>
        <input id="medicationName" type="text" value="${medication ? escapeHTML(medication.name) : ""}" placeholder="Ex.: Vitamina D" required>
      </div>

      <div class="form-group">
        <label for="medicationPeriod">Período</label>
        <select id="medicationPeriod" required>
          <option value="morning" ${medication && medication.period === "morning" ? "selected" : ""}>🌅 Manhã</option>
          <option value="afternoon" ${medication && medication.period === "afternoon" ? "selected" : ""}>☀️ Tarde</option>
          <option value="night" ${medication && medication.period === "night" ? "selected" : ""}>🌙 Noite</option>
        </select>
      </div>

      <div class="form-group">
        <label for="medicationTime">Horário</label>
        <input id="medicationTime" type="time" value="${medication && medication.time ? escapeHTML(medication.time) : ""}" required>
      </div>

      <div style="display:flex; gap:8px; margin-top:20px;">
        <button type="button" id="cancelMedicationForm" class="secondary-button">Cancelar</button>
        <button type="submit" class="primary-button">Salvar</button>
      </div>
    </form>
  `;

  document.getElementById("closeMedicationForm").addEventListener("click", renderMedicationManager);
  document.getElementById("cancelMedicationForm").addEventListener("click", renderMedicationManager);

  document.getElementById("medicationForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("medicationName").value.trim();
    const period = document.getElementById("medicationPeriod").value;
    const time = document.getElementById("medicationTime").value;

    if (!name || !time) return;

    let medObject = null;

    if (isEditing) {
      const index = medications.findIndex(item => item.id === medication.id);
      if (index !== -1) {
        medications[index] = {
          ...medications[index],
          name,
          period,
          time,
          active: true
        };
        medObject = medications[index];
      }

      database.records = database.records.map(record => {
        if (record.type === "medication" && record.medicationId === medication.id) {
          const updatedRec = { ...record, medicationName: name, period };
          syncRecordToSupabase(updatedRec, false);
          return updatedRec;
        }
        return record;
      });
    } else {
      medObject = {
        id: generateMedicationId(),
        name,
        period,
        time,
        active: true
      };
      medications.push(medObject);
    }

    saveMedications();
    saveDatabase();

    if (medObject) {
      syncMedicationToSupabase(medObject);
    }

    renderMedicationManager();
    renderDashboard();
  });
}

function deleteMedication(id) {
  const medication = medications.find(item => item.id === id);
  if (!medication) return;

  if (!confirm(`Excluir "${medication.name}" da lista de medicamentos / suplementos e vitaminas?`)) return;

  medications = medications.filter(item => item.id !== id);

  const removedRecords = database.records.filter(record => record.type === "medication" && record.medicationId === id);
  database.records = database.records.filter(record => !(record.type === "medication" && record.medicationId === id));

  saveMedications();
  saveDatabase();

  deleteMedicationFromSupabase(id);
  removedRecords.forEach(rec => deleteRecordFromSupabase(rec.id));

  renderMedicationManager();
  renderDashboard();
}

/* =========================================================
   ÁGUA — REGISTROS
========================================================= */

function getWaterRecordsForDate(dateKey = formatDateKey(selectedDate)) {
  return database.records.filter(record => record.type === WATER_RECORD_TYPE && record.date === dateKey);
}

function getWaterTotalForDate(dateKey = formatDateKey(selectedDate)) {
  return getWaterRecordsForDate(dateKey).reduce((total, record) => total + Number(record.amount || 0), 0);
}

function formatWaterAmount(amount) {
  const value = Number(amount || 0);
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000} L`;
  return `${value} ml`;
}

function addWater(amount) {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const dateKey = formatDateKey(selectedDate);
  const record = {
    id: generateId(),
    type: WATER_RECORD_TYPE,
    date: dateKey,
    time: currentTime(),
    amount: amount,
    action: "add",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  database.records.push(record);

  saveDatabase();
  syncRecordToSupabase(record, false);

  renderWaterHome();
  renderDashboard();
}

function removeWater(amount) {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const dateKey = formatDateKey(selectedDate);
  const currentTotal = getWaterTotalForDate(dateKey);
  if (currentTotal <= 0) return;

  const amountToRemove = Math.min(amount, currentTotal);

  const record = {
    id: generateId(),
    type: WATER_RECORD_TYPE,
    date: dateKey,
    time: currentTime(),
    amount: -amountToRemove,
    action: "remove",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  database.records.push(record);

  saveDatabase();
  syncRecordToSupabase(record, false);

  renderWaterHome();
  renderDashboard();
}

/* =========================================================
   💧 ÁGUA — PAINEL VISUAL
========================================================= */

function renderWaterHome() {
  let container = document.getElementById("waterHomePanel");

  if (!container) {
    const quickActions = document.querySelector(".quick-actions");
    if (!quickActions) return;

    container = document.createElement("section");
    container.id = "waterHomePanel";
    container.className = "card";
    quickActions.insertAdjacentElement("afterend", container);
  }

  const total = getWaterTotalForDate();
  const goal = Number(waterSettings.dailyGoal || 0);

  const rawPercentage = goal > 0 ? (total / goal) * 100 : 0;
  const percentage = goal > 0 ? Math.round(rawPercentage) : 0;
  const visualPercentage = Math.min(100, Math.max(0, rawPercentage));
  const remaining = Math.max(0, goal - total);
  const exceeded = total > goal;

  const remainingText = exceeded
    ? `Meta ultrapassada em ${formatWaterAmount(total - goal)}`
    : `${formatWaterAmount(remaining)} restantes para a meta`;

  container.innerHTML = `
    <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <h2>💧 Água</h2>
        <p>Controle sua hidratação diária.</p>
      </div>
    </div>

    <div style="margin-top:18px; text-align:center;">
      <div style="font-size:2.2rem; font-weight:800; line-height:1.1;">
        ${formatWaterAmount(total)}
      </div>

      <div style="margin-top:6px; font-size:.95rem; opacity:.72;">
        Meta: <strong>${formatWaterAmount(goal)}</strong>
      </div>

      <div style="position:relative; margin:20px auto 0; width:min(100%,460px); height:30px; border-radius:999px; background:rgba(120,180,210,.16); border:1px solid rgba(120,180,210,.28); overflow:hidden; box-shadow: inset 0 2px 5px rgba(0,0,0,.06);">
        <div style="position:absolute; left:0; top:0; bottom:0; width:${visualPercentage}%; border-radius:999px; background: linear-gradient(90deg, #b8e8ff 0%, #8bd5f5 50%, #64c4ed 100%); box-shadow: 0 2px 8px rgba(80,180,225,.28); transition: width .45s ease;"></div>
        <div style="position:absolute; left:0; top:4px; height:5px; width:${visualPercentage}%; border-radius:999px; background:rgba(255,255,255,.55); transition: width .45s ease; pointer-events:none;"></div>
      </div>

      <div style="margin-top:10px; font-weight:700; font-size:1rem;">
        ${percentage}% da meta
      </div>

      <div style="margin-top:5px; font-size:.9rem; opacity:.72;">
        ${remainingText}
      </div>

      ${exceeded ? `<div style="margin-top:7px; font-size:.85rem; font-weight:600; opacity:.8;">💧 Excelente! Você já atingiu sua meta.</div>` : ""}
    </div>

    <div style="display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:10px; margin-top:20px;">
      <button type="button" class="primary-button water-action-button" data-water-action="add" data-water-amount="200">+200 ml</button>
      <button type="button" class="secondary-button water-action-button" data-water-action="remove" data-water-amount="200">−200 ml</button>
      <button type="button" class="primary-button water-action-button" data-water-action="add" data-water-amount="500">+500 ml</button>
      <button type="button" class="secondary-button water-action-button" data-water-action="remove" data-water-amount="500">−500 ml</button>
      <button type="button" class="primary-button water-action-button" data-water-action="add" data-water-amount="750">+750 ml</button>
      <button type="button" class="secondary-button water-action-button" data-water-action="remove" data-water-amount="750">−750 ml</button>
      <button type="button" class="primary-button water-action-button" data-water-action="add" data-water-amount="1000">+1 L</button>
      <button type="button" class="secondary-button water-action-button" data-water-action="remove" data-water-amount="1000">−1 L</button>
    </div>

    <div style="margin-top:16px; display:flex; justify-content:center;">
      <button type="button" id="waterGoalButton" class="secondary-button">⚙️ Alterar meta diária</button>
    </div>
  `;

  container.querySelectorAll(".water-action-button").forEach(button => {
    button.addEventListener("click", () => {
      const amount = Number(button.dataset.waterAmount);
      const action = button.dataset.waterAction;

      if (action === "add") {
        addWater(amount);
      } else {
        removeWater(amount);
      }
    });
  });

  const goalButton = document.getElementById("waterGoalButton");
  if (goalButton) {
    goalButton.addEventListener("click", openWaterGoalForm);
  }
}

/* =========================================================
   META DE ÁGUA
========================================================= */

function openWaterGoalForm() {
  const currentGoal = Number(waterSettings.dailyGoal || defaultWaterSettings.dailyGoal);
  const value = prompt("Digite sua meta diária de água em ml:", currentGoal);

  if (value === null) return;

  const goal = Number(value);
  if (!Number.isFinite(goal) || goal <= 0) {
    alert("Digite uma meta válida maior que zero.");
    return;
  }

  waterSettings.dailyGoal = Math.round(goal);
  saveWaterSettings();
  renderWaterHome();
}

/* =========================================================
   HISTÓRICO DA ÁGUA
========================================================= */

function renderWaterHistory() {
  const container = document.getElementById("waterHistoryContent");
  if (!container) return;

  const records = database.records
    .filter(record => record.type === WATER_RECORD_TYPE)
    .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));

  if (records.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum registro de água.</div>`;
    return;
  }

  container.innerHTML = records
    .map(record => `
      <div class="timeline-item" style="margin-bottom:10px;">
        <div class="timeline-icon">💧</div>
        <div class="timeline-content">
          <div class="timeline-title">${escapeHTML(record.date)} · ${escapeHTML(record.time || "")}</div>
          <div class="timeline-detail">
            ${Number(record.amount) >= 0 ? "+" : ""}${formatWaterAmount(Math.abs(Number(record.amount)))}
          </div>
        </div>
      </div>
    `)
    .join("");
}

/* =========================================================
   LIMPEZA DE PAINÉIS DUPLICADOS DE ÁGUA
========================================================= */

function removeDuplicateWaterPanels() {
  const validPanel = document.getElementById("waterHomePanel");

  document.querySelectorAll("[id*='water'], [id*='Water'], [class*='water'], [class*='Water']").forEach(element => {
    if (validPanel && element === validPanel) return;
    if (element.id === "waterHomePanel") return;

    const text = element.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    if (text.includes("água meta diária") && element !== validPanel) {
      element.remove();
    }
  });
}

/* =========================================================
   BOTÃO DE ÁGUA
========================================================= */

function ensureWaterQuickButton() {
  const quickActions = document.querySelector(".quick-actions");
  if (!quickActions) return;

  quickActions.querySelectorAll("button").forEach(button => {
    if (button.id === "waterQuickButton") return;

    const text = button.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    if (text === "💧 água" || text === "água" || text.includes("água meta diária")) {
      button.remove();
    }
  });

  if (document.getElementById("waterQuickButton")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.id = "waterQuickButton";
  button.className = "quick-button";
  button.innerHTML = `<span>💧</span> Água`;

  quickActions.appendChild(button);

  button.addEventListener("click", () => {
    renderWaterHome();
    const panel = document.getElementById("waterHomePanel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

/* =========================================================
   BOTÕES PRINCIPAIS E MODAIS
========================================================= */

document.querySelectorAll("[data-record-type]").forEach(button => {
  button.addEventListener("click", () => {
    openRecordForm(button.dataset.recordType);
  });
});

const medicationQuickButton = document.getElementById("medicationQuickButton");
if (medicationQuickButton) {
  medicationQuickButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    openMedicationManager();
  });
}

const consultationQuickButton = document.getElementById("consultationQuickButton");
if (consultationQuickButton) {
  consultationQuickButton.addEventListener("click", () => {
    openConsultationsScreen();
  });
}

const closeModal = document.getElementById("closeModal");
if (closeModal) {
  closeModal.addEventListener("click", () => {
    if (modal) modal.close();
  });
}

const cancelButton = document.getElementById("cancelButton");
if (cancelButton) {
  cancelButton.addEventListener("click", () => {
    if (modal) modal.close();
  });
}

/* =========================================================
   NAVEGAÇÃO POR DIAS
========================================================= */

const previousDay = document.getElementById("previousDay");
if (previousDay) {
  previousDay.addEventListener("click", () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    renderDashboard();
  });
}

const nextDay = document.getElementById("nextDay");
if (nextDay) {
  nextDay.addEventListener("click", () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    renderDashboard();
  });
}

/* =========================================================
   DIÁRIO
========================================================= */

function renderDiary() {
  const container = document.getElementById("diaryContent");
  if (!container) return;

  if (database.records.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum registro encontrado.</div>`;
    return;
  }

  const sortedRecords = [...database.records]
    .filter(record => record.type !== WATER_RECORD_TYPE)
    .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));

  if (sortedRecords.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhum registro encontrado.</div>`;
    return;
  }

  container.innerHTML = sortedRecords.map(createDiaryItem).join("");
}

function createDiaryItem(record) {
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

  if (record.type === "meal") {
    title = record.mealType || "Refeição";
    detail = record.food || "Refeição registrada";
  } else if (record.type === "glucose") {
    title = `${record.value} mg/dL`;
    detail = record.kind || "Glicemia";
  } else if (record.type === "insulin") {
    title = `${record.dose} U`;
    detail = record.insulin || "Insulina";
    if (record.application) detail += ` · ${record.application}`;
  } else if (record.type === "activity") {
    title = record.activity || "Atividade";
    detail = `${record.duration || 0} min`;
    if (record.intensity) detail += ` · ${record.intensity}`;
  } else if (record.type === "medication") {
    title = record.medicationName || "Medicamento / suplemento / vitamina";
    detail = "Tomado";
    if (record.period) {
      const periods = { morning: "Manhã", afternoon: "Tarde", night: "Noite" };
      detail += ` · ${periods[record.period] || record.period}`;
    }
  } else if (record.type === "consultation") {
    title = record.specialty || "Consulta";
    detail = record.professional || "Consulta médica";
    if (record.location) detail += ` · ${record.location}`;
  }

  return `
    <div class="timeline-item" style="margin-bottom:12px;">
      <div class="timeline-icon">
        ${icons[record.type] || "📝"}
      </div>

      <div class="timeline-content">
        <div class="timeline-title">
          ${escapeHTML(record.date)} · ${escapeHTML(record.time || "")}
        </div>

        <div class="timeline-detail">
          ${escapeHTML(title)} · ${escapeHTML(detail)}
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   LIXEIRA
========================================================= */

function renderTrash() {
  const container = document.getElementById("trashContent");
  if (!container) return;

  if (!database.trash || database.trash.length === 0) {
    container.innerHTML = `<div class="empty-state">A lixeira está vazia.</div>`;
    return;
  }

  const sortedTrash = [...database.trash].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  container.innerHTML = `
    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      <button type="button" id="emptyTrashButton" class="secondary-button">
        Esvaziar lixeira
      </button>
    </div>

    ${sortedTrash.map(createTrashItem).join("")}
  `;

  const button = document.getElementById("emptyTrashButton");
  if (button) button.addEventListener("click", emptyTrash);
}

function createTrashItem(record) {
  const icons = {
    meal: "🍽️",
    glucose: "🩸",
    insulin: "💉",
    activity: "🏋️",
    medication: "💊",
    consultation: "🩺",
    water: "💧"
  };

  let title = "";
  let detail = "";

  if (record.type === WATER_RECORD_TYPE) {
    title = "Água";
    detail = `${Number(record.amount) >= 0 ? "+" : ""}${formatWaterAmount(Math.abs(Number(record.amount)))}`;
  } else if (record.type === "meal") {
    title = record.mealType || "Refeição";
    detail = record.food || "Refeição registrada";
  } else if (record.type === "glucose") {
    title = `${record.value} mg/dL`;
    detail = record.kind || "Glicemia";
  } else if (record.type === "insulin") {
    title = `${record.dose} U`;
    detail = record.insulin || "Insulina";
  } else if (record.type === "activity") {
    title = record.activity || "Atividade";
    detail = `${record.duration || 0} min`;
  } else if (record.type === "medication") {
    title = record.medicationName || "Medicamento / suplemento / vitamina";
    detail = "Tomado";
  } else if (record.type === "consultation") {
    title = record.specialty || "Consulta";
    detail = record.professional || "Consulta médica";
  }

  return `
    <div class="timeline-item" style="margin-bottom:12px;">
      <div class="timeline-icon">
        ${icons[record.type] || "📝"}
      </div>

      <div class="timeline-content">
        <div class="timeline-title">
          ${escapeHTML(record.time || "")} · ${escapeHTML(title)}
        </div>

        <div class="timeline-detail">
          ${escapeHTML(detail)}
        </div>

        <div class="timeline-detail" style="margin-top:4px;">
          ${escapeHTML(record.date || "")}
        </div>
      </div>

      <div class="timeline-actions">
        <button type="button" onclick="restoreRecord('${escapeHTML(record.id)}')" title="Restaurar">
          ↩️
        </button>

        <button type="button" onclick="permanentlyDeleteRecord('${escapeHTML(record.id)}')" title="Excluir definitivamente">
          ❌
        </button>
      </div>
    </div>
  `;
}

function restoreRecord(id) {
  const index = database.trash.findIndex(item => item.id === id);
  if (index === -1) return;

  const record = database.trash[index];
  const restoredRecord = { ...record };
  delete restoredRecord.deletedAt;

  database.records.push(restoredRecord);
  database.trash.splice(index, 1);

  saveDatabase();
  syncRecordToSupabase(restoredRecord, false);

  renderTrash();
  renderDashboard();
  renderDiary();
  renderConsultations();

  alert("Registro restaurado.");
}

function permanentlyDeleteRecord(id) {
  if (!confirm("Excluir este registro definitivamente? Esta ação não poderá ser desfeita.")) {
    return;
  }

  database.trash = database.trash.filter(item => item.id !== id);
  saveDatabase();
  deleteRecordFromSupabase(id);

  renderTrash();
}

function emptyTrash() {
  if (!database.trash || database.trash.length === 0) return;

  if (!confirm("Esvaziar toda a lixeira? Todos esses registros serão excluídos definitivamente.")) {
    return;
  }

  database.trash = [];
  saveDatabase();
  emptyTrashFromSupabase();

  renderTrash();
}

/* =========================================================
   CONFIGURAÇÕES DE GLICEMIA
========================================================= */

function renderGlucoseSettings() {
  const container = document.getElementById("settingsPanel");
  if (!container) return;

  const items = [
    ["fasting", "Jejum"],
    ["breakfast1", "1h após o café da manhã"],
    ["breakfast2", "2h após o café da manhã"],
    ["morningSnack1", "1h após o lanche da manhã"],
    ["morningSnack2", "2h após o lanche da manhã"],
    ["lunch1", "1h após o almoço"],
    ["lunch2", "2h após o almoço"],
    ["afternoonSnack1", "1h após o lanche da tarde"],
    ["afternoonSnack2", "2h após o lanche da tarde"],
    ["dinner1", "1h após o jantar"],
    ["dinner2", "2h após o jantar"],
    ["supper1", "1h após a ceia"],
    ["supper2", "2h após a ceia"]
  ];

  let html = `
    <h2>Configurações</h2>

    <div class="card">
      <h3>Medições de glicemia</h3>
      <p>Ative somente os momentos em que você deseja que apareçam no registro de glicemia.</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
  `;

  items.forEach(item => {
    html += `
      <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
        <input type="checkbox" class="glucose-setting-checkbox" data-glucose-key="${item[0]}" ${glucoseSettings[item[0]] ? "checked" : ""}>
        <span>${escapeHTML(item[1])}</span>
      </label>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll(".glucose-setting-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      glucoseSettings[checkbox.dataset.glucoseKey] = checkbox.checked;
      saveGlucoseSettings();
    });
  });
}

function renderMoreScreen() {
  const trashPanel = document.getElementById("trashPanel");
  const settingsPanel = document.getElementById("settingsPanel");

  if (trashPanel) trashPanel.hidden = true;
  if (settingsPanel) settingsPanel.hidden = true;
}

/* =========================================================
   BOTÃO LIXEIRA
========================================================= */

const openTrashButton = document.getElementById("openTrashButton");
if (openTrashButton) {
  openTrashButton.addEventListener("click", () => {
    const trashPanel = document.getElementById("trashPanel");
    const settingsPanel = document.getElementById("settingsPanel");

    if (trashPanel) trashPanel.hidden = false;
    if (settingsPanel) settingsPanel.hidden = true;

    renderTrash();
  });
}

/* =========================================================
   BOTÃO CONFIGURAÇÕES
========================================================= */

const settingsButton = document.getElementById("settingsButton");
if (settingsButton) {
  settingsButton.addEventListener("click", () => {
    const trashPanel = document.getElementById("trashPanel");
    const settingsPanel = document.getElementById("settingsPanel");

    if (trashPanel) trashPanel.hidden = true;
    if (settingsPanel) settingsPanel.hidden = false;

    renderGlucoseSettings();
  });
}

/* =========================================================
   NAVEGAÇÃO PRINCIPAL
========================================================= */

const navigationItems = document.querySelectorAll(".navigation-item");
navigationItems.forEach(button => {
  button.addEventListener("click", () => {
    const targetScreen = button.dataset.screen;
    if (targetScreen) showScreen(targetScreen);
  });
});

/* =========================================================
   DELEGAÇÃO
========================================================= */

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  const text = button.textContent.replace(/\s+/g, " ").trim().toLowerCase();

  if (
    button.id === "medicationQuickButton" ||
    text.includes("medicamentos / suplementos e vitaminas") ||
    text.includes("medicamentos/suplementos e vitaminas")
  ) {
    if (button.closest("#medicationManager")) return;

    event.preventDefault();
    event.stopPropagation();
    openMedicationManager();
  }
});

/* =========================================================
   BACKUP
========================================================= */

const backupButton = document.getElementById("backupButton");
if (backupButton) {
  backupButton.addEventListener("click", createBackup);
}

function createBackup() {
  const backup = {
    application: "Recordatório + Registros",
    version: "0.1",
    createdAt: new Date().toISOString(),
    data: {
      records: database.records,
      trash: database.trash
    },
    glucoseSettings: glucoseSettings,
    medications: medications,
    waterSettings: waterSettings
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Recordatorio_Backup_${formatDateKey(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* =========================================================
   RESTAURAÇÃO DE BACKUP
========================================================= */

function restoreBackupFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function(event) {
    try {
      const backup = JSON.parse(event.target.result);

      if (!validateBackup(backup)) {
        alert("Este arquivo não é um backup válido do Recordatório + Registros.");
        return;
      }

      if (!confirm("Restaurar este backup substituirá os registros atuais do aplicativo. Deseja continuar?")) {
        return;
      }

      database = {
        records: backup.data.records,
        trash: backup.data.trash
      };

      glucoseSettings = {
        ...defaultGlucoseOptions,
        ...backup.glucoseSettings
      };

      medications = Array.isArray(backup.medications) ? backup.medications : [];

      waterSettings = {
        ...defaultWaterSettings,
        ...(backup.waterSettings || {})
      };

      saveDatabase();
      saveGlucoseSettings();
      saveMedications();
      saveWaterSettings();

      if (currentUser && supabase) {
        localStorage.removeItem(`${MIGRATION_FLAG_KEY}_${currentUser.id}`);
        await checkAndRunMigration();
      }

      renderDashboard();
      renderDiary();
      renderTrash();
      renderConsultations();
      renderWaterHome();

      alert("Backup restaurado com sucesso.");
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      alert("Não foi possível ler este arquivo de backup.");
    }
  };

  reader.readAsText(file);
}

function validateBackup(backup) {
  return Boolean(
    backup &&
      typeof backup === "object" &&
      backup.application === "Recordatório + Registros" &&
      backup.data &&
      typeof backup.data === "object" &&
      Array.isArray(backup.data.records) &&
      Array.isArray(backup.data.trash) &&
      backup.glucoseSettings &&
      typeof backup.glucoseSettings === "object"
  );
}

const restoreBackupButton = document.getElementById("restoreBackupButton");
const restoreBackupInput = document.getElementById("restoreBackupInput");

if (restoreBackupButton) {
  restoreBackupButton.addEventListener("click", () => {
    if (restoreBackupInput) restoreBackupInput.click();
  });
}

if (restoreBackupInput) {
  restoreBackupInput.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    restoreBackupFile(file);
    event.target.value = "";
  });
}

/* =========================================================
   INICIALIZAÇÃO DA APLICAÇÃO
========================================================= */

removeDuplicateWaterPanels();
ensureWaterQuickButton();
renderDashboard();
renderDiary();
renderTrash();
renderConsultations();

// Verifica e recupera o usuário autenticado no Supabase ao carregar o aplicativo
checkAndInitUser();

/* =====================================================
   INTEGRAÇÃO SUPABASE - AUTENTICAÇÃO E MIGRAÇÃO
====================================================== */

// Instância global do cliente Supabase
let supabase = null;
let currentUser = null;

// Inicializa o cliente Supabase se as chaves existirem no HTML
if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  supabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
}

/**
 * Realiza o login no Supabase
 */
async function loginWithSupabase(email, password) {
  if (!supabase) {
    console.error("Cliente Supabase não configurado.");
    return { error: { message: "Supabase não configurado no HTML." } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (!error && data.user) {
    currentUser = data.user;
    // Tenta migrar dados antigos do localStorage para o Supabase
    if (typeof migrateLocalStorageToSupabase === "function") {
      await migrateLocalStorageToSupabase(currentUser.id);
    }
  }

  return { data, error };
}

/**
 * Verifica se já existe um usuário logado na sessão ativa
 */
async function checkAndInitUser() {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    currentUser = session.user;
    return currentUser;
  }
  return null;
}

/**
 * Envia e-mail para redefinição de senha
 */
async function resetPasswordSupabase(email) {
  if (!supabase) return { error: { message: "Supabase não configurado." } };
  const redirectTo = window.location.origin + window.location.pathname;
  return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

/**
 * Atualiza a senha do usuário
 */
async function updatePasswordSupabase(newPassword) {
  if (!supabase) return { error: { message: "Supabase não configurado." } };
  return await supabase.auth.updateUser({ password: newPassword });
}
