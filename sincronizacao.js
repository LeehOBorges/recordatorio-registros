/* =========================================================
   RECORDATÓRIO + REGISTROS
   SINCRONIZAÇÃO COM SUPABASE
   VERSÃO CORRIGIDA

   - Mantém localStorage como cópia local
   - Usa Supabase como banco central
   - Não apaga registros existentes
   - Mantém lixeira
   - Evita duplicação por user_id + local_id
   - Atualiza o database em memória do app.js
   - Evita criar múltiplos clientes Supabase quando possível
========================================================= */

(function () {

  "use strict";


  /* =====================================================
     CONFIGURAÇÃO
  ====================================================== */

  const SUPABASE_URL =
    "https://gutbveorftpahuyjonnv.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_L8XMa2cXo2aWaGHHMdP1Tw_JtjABUQi";

  const STORAGE_KEY =
    "recordatorio_registros_v01";


  /* =====================================================
     CLIENTE SUPABASE
  ====================================================== */

  let syncClient = null;

  try {

    /*
     * Se já existir um cliente criado pela página,
     * reutilizamos esse cliente.
     */

    if (
      window.supabase &&
      window.supabase.auth &&
      typeof window.supabase.from === "function"
    ) {

      syncClient =
        window.supabase;

    }

    /*
     * Caso window.supabase seja apenas a biblioteca,
     * criamos um único cliente para a sincronização.
     */

    else if (
      window.supabase &&
      typeof window.supabase.createClient ===
        "function"
    ) {

      syncClient =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        );

    }

  } catch (error) {

    console.error(
      "Erro ao iniciar cliente Supabase:",
      error
    );

  }


  /* =====================================================
     CONTROLE
  ====================================================== */

  let syncing = false;

  let syncTimer = null;

  let authListenerInstalled = false;

  let saveHookInstalled = false;


  /* =====================================================
     UTILITÁRIOS
  ====================================================== */

  function nowISO() {

    return new Date().toISOString();

  }


  function cloneObject(object) {

    try {

      return JSON.parse(
        JSON.stringify(object)
      );

    } catch (error) {

      return {};

    }

  }


  function getTimestamp(record) {

    if (!record) {
      return nowISO();
    }

    return (
      record.deletedAt ||
      record.updatedAt ||
      record.createdAt ||
      nowISO()
    );

  }


  function getTimestampNumber(record) {

    const value =
      getTimestamp(record);

    const time =
      new Date(value).getTime();

    return Number.isFinite(time)
      ? time
      : 0;

  }


  /* =====================================================
     BANCO LOCAL
  ====================================================== */

  function loadLocalDatabase() {

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
        "Erro ao ler banco local:",
        error
      );


      return {
        records: [],
        trash: []
      };

    }

  }


  function saveLocalDatabase(
    records,
    trash
  ) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          records,
          trash
        })
      );

      return true;

    } catch (error) {

      console.error(
        "Erro ao salvar banco local:",
        error
      );

      return false;

    }

  }


  /* =====================================================
     ATUALIZAR ESTADO DO APP.JS
  ====================================================== */

  function updateAppDatabase(
    records,
    trash
  ) {

    /*
     * O app.js possui:
     *
     * let database = loadDatabase();
     *
     * Essa variável fica em memória.
     *
     * Alterar apenas o localStorage NÃO altera
     * essa variável.
     *
     * Aqui fazemos a ponte entre a sincronização
     * e o estado real utilizado pelo aplicativo.
     */

    try {

      if (
        typeof window.database !==
        "undefined"
      ) {

        window.database.records =
          cloneObject(records);

        window.database.trash =
          cloneObject(trash);

        return true;

      }

    } catch (error) {

      console.warn(
        "Não foi possível atualizar window.database:",
        error
      );

    }


    /*
     * Como database foi declarado com let no app.js,
     * ele pode não estar disponível como window.database.
     *
     * Nesse caso, usamos eventos para avisar o app.js.
     */

    try {

      document.dispatchEvent(
        new CustomEvent(
          "recordatorioDatabaseUpdated",
          {
            detail: {
              records:
                cloneObject(records),

              trash:
                cloneObject(trash)
            }
          }
        )
      );

    } catch (error) {

      console.warn(
        "Erro ao enviar atualização para o app.js:",
        error
      );

    }


    return false;

  }


  /* =====================================================
     CONVERTER LOCAL → SUPABASE
  ====================================================== */

  function localToCloudRow(
    record,
    userId,
    excluded
  ) {

    const timestamp =
      getTimestamp(record);


    return {

      user_id:
        userId,

      local_id:
        String(
          record.id
        ),

      data:
        record.date ||
        null,

      tipo:
        record.type ||
        null,

      dados:
        cloneObject(
          record
        ),

      excluido:
        Boolean(
          excluded
        ),

      atualizado_em:
        timestamp

    };

  }


  /* =====================================================
     CONVERTER SUPABASE → LOCAL
  ====================================================== */

  function cloudRowToLocal(
    row
  ) {

    const original =
      row &&
      row.dados &&
      typeof row.dados === "object"
        ? cloneObject(
            row.dados
          )
        : {};


    original.id =
      row.local_id ||
      original.id ||
      "";


    if (!original.date) {

      original.date =
        row.data ||
        "";

    }


    if (!original.type) {

      original.type =
        row.tipo ||
        "";

    }


    if (
      row.atualizado_em
    ) {

      /*
       * O timestamp da nuvem é a referência
       * quando o registro vem do Supabase.
       */

      original.updatedAt =
        row.atualizado_em;

    }


    if (
      row.criado_em &&
      !original.createdAt
    ) {

      original.createdAt =
        row.criado_em;

    }


    if (
      row.excluido
    ) {

      original.deletedAt =
        original.deletedAt ||
        row.atualizado_em ||
        nowISO();

    }


    return original;

  }


  /* =====================================================
     USUÁRIO ATUAL
  ====================================================== */

  async function getCurrentUser() {

    if (!syncClient) {

      return null;

    }


    try {

      /*
       * Primeiro tentamos getUser().
       */

      const result =
        await syncClient.auth.getUser();


      if (
        result &&
        result.data &&
        result.data.user
      ) {

        return result.data.user;

      }


      /*
       * Fallback para getSession().
       */

      const sessionResult =
        await syncClient.auth.getSession();


      if (
        sessionResult &&
        sessionResult.data &&
        sessionResult.data.session &&
        sessionResult.data.session.user
      ) {

        return sessionResult.data.session.user;

      }


      return null;

    } catch (error) {

      console.error(
        "Erro ao identificar usuário:",
        error
      );

      return null;

    }

  }


  /* =====================================================
     MAPA LOCAL
  ====================================================== */

  function createLocalMap(
    database
  ) {

    const map =
      new Map();


    function addRecord(
      record,
      excluded
    ) {

      if (
        !record ||
        !record.id
      ) {

        return;

      }


      const id =
        String(
          record.id
        );


      const existing =
        map.get(id);


      const item = {

        record:
          cloneObject(
            record
          ),

        excluded:
          Boolean(
            excluded
          )

      };


      if (!existing) {

        map.set(
          id,
          item
        );

        return;

      }


      const existingTime =
        getTimestampNumber(
          existing.record
        );


      const newTime =
        getTimestampNumber(
          item.record
        );


      if (
        newTime >=
        existingTime
      ) {

        map.set(
          id,
          item
        );

      }

    }


    database.records.forEach(
      function (record) {

        addRecord(
          record,
          false
        );

      }
    );


    database.trash.forEach(
      function (record) {

        addRecord(
          record,
          true
        );

      }
    );


    return map;

  }


  /* =====================================================
     BUSCAR NUVEM
  ====================================================== */

  async function loadCloudRows(
    userId
  ) {

    const result =
      await syncClient
        .from("registros")
        .select(
          "id,user_id,local_id,data,tipo,dados,criado_em,atualizado_em,excluido"
        )
        .eq(
          "user_id",
          userId
        );


    if (
      result.error
    ) {

      throw result.error;

    }


    return Array.isArray(
      result.data
    )
      ? result.data
      : [];

  }


  /* =====================================================
     MAPA DA NUVEM
  ====================================================== */

  function createCloudMap(
    cloudRows
  ) {

    const map =
      new Map();


    cloudRows.forEach(
      function (row) {

        if (
          !row ||
          !row.local_id
        ) {

          return;

        }


        const id =
          String(
            row.local_id
          );


        const record =
          cloudRowToLocal(
            row
          );


        const item = {

          record,

          excluded:
            Boolean(
              row.excluido
            ),

          cloudUpdatedAt:
            row.atualizado_em
              ? new Date(
                  row.atualizado_em
                ).getTime()
              : 0

        };


        const existing =
          map.get(id);


        if (!existing) {

          map.set(
            id,
            item
          );

          return;

        }


        if (
          item.cloudUpdatedAt >=
          existing.cloudUpdatedAt
        ) {

          map.set(
            id,
            item
          );

        }

      }
    );


    return map;

  }


  /* =====================================================
     UNIFICAR LOCAL + NUVEM
  ====================================================== */

  function mergeData(
    localMap,
    cloudRows
  ) {

    const merged =
      new Map(
        localMap
      );


    const cloudMap =
      createCloudMap(
        cloudRows
      );


    cloudMap.forEach(
      function (
        cloudItem,
        id
      ) {

        const existing =
          merged.get(id);


        if (!existing) {

          merged.set(
            id,
            {

              record:
                cloneObject(
                  cloudItem.record
                ),

              excluded:
                cloudItem.excluded

            }
          );

          return;

        }


        const localTime =
          getTimestampNumber(
            existing.record
          );


        const cloudTime =
          cloudItem.cloudUpdatedAt ||
          getTimestampNumber(
            cloudItem.record
          );


        /*
         * Se a nuvem é mais recente,
         * ela vence.
         *
         * Se o local é mais recente,
         * o local será enviado posteriormente.
         */

        if (
          cloudTime >
          localTime
        ) {

          merged.set(
            id,
            {

              record:
                cloneObject(
                  cloudItem.record
                ),

              excluded:
                cloudItem.excluded

            }
          );

        }

      }
    );


    return merged;

  }


  /* =====================================================
     MAPA → BANCO LOCAL
  ====================================================== */

  function buildLocalDatabase(
    merged
  ) {

    const records = [];

    const trash = [];


    merged.forEach(
      function (item) {

        if (
          !item ||
          !item.record ||
          !item.record.id
        ) {

          return;

        }


        const record =
          cloneObject(
            item.record
          );


        if (
          item.excluded
        ) {

          /*
           * Garantimos deletedAt para a lixeira.
           */

          if (
            !record.deletedAt
          ) {

            record.deletedAt =
              record.updatedAt ||
              nowISO();

          }


          trash.push(
            record
          );

        } else {

          /*
           * Se um registro voltou a ficar ativo,
           * removemos deletedAt.
           */

          delete record.deletedAt;

          records.push(
            record
          );

        }

      }
    );


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


        if (
          dateA !==
          dateB
        ) {

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


    trash.sort(
      function (a, b) {

        return getTimestampNumber(
          b
        ) -
        getTimestampNumber(
          a
        );

      }
    );


    return {

      records,

      trash

    };

  }


  /* =====================================================
     ENVIAR MAPA COMPLETO PARA SUPABASE
  ====================================================== */

  async function uploadMergedData(
    merged,
    userId
  ) {

    const rows = [];


    merged.forEach(
      function (item) {

        if (
          !item ||
          !item.record ||
          !item.record.id
        ) {

          return;

        }


        rows.push(
          localToCloudRow(
            item.record,
            userId,
            item.excluded
          )
        );

      }
    );


    if (
      rows.length === 0
    ) {

      return;

    }


    const result =
      await syncClient
        .from("registros")
        .upsert(
          rows,
          {
            onConflict:
              "user_id,local_id"
          }
        );


    if (
      result.error
    ) {

      throw result.error;

    }

  }


  /* =====================================================
     ATUALIZAR INTERFACE
  ====================================================== */

  function refreshApplication(
    mergedDatabase
  ) {

    /*
     * Primeiro salvamos no localStorage.
     */

    saveLocalDatabase(
      mergedDatabase.records,
      mergedDatabase.trash
    );


    /*
     * Depois tentamos atualizar o estado
     * em memória do aplicativo.
     */

    updateAppDatabase(
      mergedDatabase.records,
      mergedDatabase.trash
    );


    /*
     * Se o app.js possuir funções públicas,
     * atualizamos as telas.
     */

    try {

      if (
        typeof window.renderDashboard ===
        "function"
      ) {

        window.renderDashboard();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar dashboard:",
        error
      );

    }


    try {

      if (
        typeof window.renderDiary ===
        "function"
      ) {

        window.renderDiary();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar diário:",
        error
      );

    }


    try {

      if (
        typeof window.renderConsultations ===
        "function"
      ) {

        window.renderConsultations();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar consultas:",
        error
      );

    }


    try {

      if (
        typeof window.renderTrash ===
        "function"
      ) {

        window.renderTrash();

      }

    } catch (error) {

      console.warn(
        "Erro ao atualizar lixeira:",
        error
      );

    }


    /*
     * Avisamos o restante do aplicativo.
     */

    try {

      document.dispatchEvent(
        new CustomEvent(
          "recordatorioSyncComplete",
          {
            detail: {

              registros:
                mergedDatabase.records.length,

              lixeira:
                mergedDatabase.trash.length

            }
          }
        )
      );

    } catch (error) {

      console.warn(
        "Erro ao disparar evento de sincronização:",
        error
      );

    }

  }


  /* =====================================================
     SINCRONIZAÇÃO PRINCIPAL
  ====================================================== */

  async function syncNow(
    reason
  ) {

    reason =
      reason ||
      "manual";


    if (syncing) {

      return;

    }


    if (
      !navigator.onLine
    ) {

      console.log(
        "Sincronização ignorada: sem internet."
      );

      return;

    }


    if (!syncClient) {

      console.warn(
        "Cliente Supabase não disponível."
      );

      return;

    }


    syncing = true;


    try {

      const user =
        await getCurrentUser();


      if (!user) {

        console.log(
          "Nenhum usuário autenticado. Sincronização aguardando login."
        );

        return;

      }


      /*
       * 1. Lemos o localStorage novamente.
       */

      const localDatabase =
        loadLocalDatabase();


      /*
       * 2. Criamos mapa dos dados locais.
       */

      const localMap =
        createLocalMap(
          localDatabase
        );


      /*
       * 3. Buscamos TODOS os registros do usuário.
       */

      const cloudRows =
        await loadCloudRows(
          user.id
        );


      /*
       * 4. Unimos local + nuvem.
       */

      const merged =
        mergeData(
          localMap,
          cloudRows
        );


      /*
       * 5. Transformamos em database.
       */

      const mergedDatabase =
        buildLocalDatabase(
          merged
        );


      /*
       * 6. Atualizamos o aplicativo ANTES do upload.
       *
       * Isso é importante para que o celular
       * mostre os registros imediatamente.
       */

      refreshApplication(
        mergedDatabase
      );


      /*
       * 7. Enviamos a união para o Supabase.
       */

      await uploadMergedData(
        merged,
        user.id
      );


      console.log(
        "Sincronização concluída:",
        {
          motivo:
            reason,

          registros:
            mergedDatabase.records.length,

          lixeira:
            mergedDatabase.trash.length,

          nuvemAntes:
            cloudRows.length,

          totalUnificado:
            merged.size
        }
      );


    } catch (error) {

      console.error(
        "Erro na sincronização:",
        error
      );


      try {

        document.dispatchEvent(
          new CustomEvent(
            "recordatorioSyncError",
            {
              detail:
                error
            }
          )
        );

      } catch (_) {}

    } finally {

      syncing = false;

    }

  }


  /* =====================================================
     INTERCEPTAR SAVE DATABASE
  ====================================================== */

  function installSaveHook() {

    if (
      saveHookInstalled
    ) {

      return true;

    }


    if (
      typeof window.saveDatabase !==
      "function"
    ) {

      /*
       * saveDatabase foi declarado como função
       * global no app.js. Se ainda não estiver
       * disponível, tentaremos novamente.
       */

      return false;

    }


    const originalSaveDatabase =
      window.saveDatabase;


    window.saveDatabase =
      function () {

        originalSaveDatabase.apply(
          this,
          arguments
        );


        setTimeout(
          function () {

            syncNow(
              "salvamento"
            );

          },
          100
        );

      };


    saveHookInstalled =
      true;


    window.__recordatorioSaveHookInstalled =
      true;


    return true;

  }


  /* =====================================================
     TENTAR INSTALAR HOOK
  ====================================================== */

  function tryInstallSaveHook() {

    if (
      installSaveHook()
    ) {

      return;

    }


    setTimeout(
      tryInstallSaveHook,
      500
    );

  }


  /* =====================================================
     AUTH
  ====================================================== */

  function installAuthListener() {

    if (
      !syncClient ||
      authListenerInstalled
    ) {

      return;

    }


    if (
      !syncClient.auth ||
      typeof syncClient.auth.onAuthStateChange !==
        "function"
    ) {

      return;

    }


    authListenerInstalled =
      true;


    syncClient.auth.onAuthStateChange(
      function (
        event,
        session
      ) {

        console.log(
          "Supabase Auth:",
          event
        );


        if (
          event ===
          "INITIAL_SESSION"
        ) {

          if (session) {

            setTimeout(
              function () {

                syncNow(
                  "initial_session"
                );

              },
              500
            );

          }

        }


        if (
          event ===
          "SIGNED_IN"
        ) {

          if (session) {

            setTimeout(
              function () {

                syncNow(
                  "login"
                );

              },
              300
            );

          }

        }


        if (
          event ===
          "TOKEN_REFRESHED"
        ) {

          setTimeout(
            function () {

              syncNow(
                "token"
              );

            },
            300
          );

        }

      }
    );

  }


  /* =====================================================
     VISIBILIDADE / INTERNET / FOCO
  ====================================================== */

  function installVisibilityListener() {

    document.addEventListener(
      "visibilitychange",
      function () {

        if (
          document.visibilityState ===
          "visible"
        ) {

          setTimeout(
            function () {

              syncNow(
                "voltar_para_pagina"
              );

            },
            300
          );

        }

      }
    );


    window.addEventListener(
      "online",
      function () {

        setTimeout(
          function () {

            syncNow(
              "internet_restaurada"
            );

          },
          300
        );

      }
    );


    window.addEventListener(
      "focus",
      function () {

        setTimeout(
          function () {

            syncNow(
              "janela_ativa"
            );

          },
          300
        );

      }
    );

  }


  /* =====================================================
     SINCRONIZAÇÃO PERIÓDICA
  ====================================================== */

  function installPeriodicSync() {

    if (
      syncTimer
    ) {

      clearInterval(
        syncTimer
      );

    }


    syncTimer =
      setInterval(
        function () {

          syncNow(
            "periodica"
          );

        },
        60000
      );

  }


  /* =====================================================
     API PÚBLICA
  ====================================================== */

  window.recordatorioSyncNow =
    function () {

      return syncNow(
        "manual"
      );

    };


  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  function init() {

    tryInstallSaveHook();

    installAuthListener();

    installVisibilityListener();

    installPeriodicSync();


    setTimeout(
      function () {

        syncNow(
          "inicializacao"
        );

      },
      1500
    );

  }


  /* =====================================================
     INICIAR
  ====================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();
