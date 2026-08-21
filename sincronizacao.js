/* =========================================================
   RECORDATÓRIO + REGISTROS
   SINCRONIZAÇÃO COM SUPABASE

   - Usa o cliente criado no index.html
   - Mantém localStorage como cópia local
   - Supabase é o banco central
   - Mantém lixeira
   - Evita duplicação por user_id + local_id
   - Sincroniza após salvar
   - Sincroniza ao entrar no aplicativo
   - Sincroniza ao recuperar internet
   - Não depende de alterar o app.js
========================================================= */

(function () {

  "use strict";

  const STORAGE_KEY =
    "recordatorio_registros_v01";

  let syncing = false;
  let saveHookInstalled = false;
  let authListenerInstalled = false;
  let periodicTimer = null;


  /* =====================================================
     CLIENTE SUPABASE
  ====================================================== */

  function getSupabaseClient() {

    if (
      window.supabaseClient &&
      window.supabaseClient.auth &&
      typeof window.supabaseClient.from === "function"
    ) {

      return window.supabaseClient;

    }

    console.error(
      "Cliente Supabase não encontrado em window.supabaseClient."
    );

    return null;

  }


  /* =====================================================
     UTILITÁRIOS
  ====================================================== */

  function clone(value) {

    try {

      return JSON.parse(
        JSON.stringify(value)
      );

    } catch (error) {

      return value;

    }

  }


  function nowISO() {

    return new Date().toISOString();

  }


  function timestamp(record) {

    if (!record) {

      return 0;

    }

    const value =
      record.deletedAt ||
      record.updatedAt ||
      record.createdAt;

    if (!value) {

      return 0;

    }

    const time =
      new Date(value).getTime();

    return Number.isFinite(time)
      ? time
      : 0;

  }


  function ensureId(record) {

    if (
      !record ||
      !record.id
    ) {

      return null;

    }

    return String(
      record.id
    );

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
          Array.isArray(parsed.records)
            ? parsed.records
            : [],

        trash:
          Array.isArray(parsed.trash)
            ? parsed.trash
            : []

      };

    } catch (error) {

      console.error(
        "Erro ao carregar banco local:",
        error
      );

      return {
        records: [],
        trash: []
      };

    }

  }


  function saveLocalDatabase(
    database
  ) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          records:
            database.records || [],

          trash:
            database.trash || []
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
     ATUALIZAR APP.JS
  ====================================================== */

  function notifyApp(
    database
  ) {

    /*
     * Primeiro tentamos window.database.
     *
     * Se o app.js tiver essa variável disponível,
     * atualizamos diretamente.
     */

    try {

      if (
        window.database &&
        typeof window.database === "object"
      ) {

        window.database.records =
          clone(database.records);

        window.database.trash =
          clone(database.trash);

      }

    } catch (error) {

      console.warn(
        "Não foi possível atualizar window.database:",
        error
      );

    }


    /*
     * Como o app.js pode ter declarado
     * "let database", ele pode não aparecer
     * em window.
     *
     * Por isso também enviamos um evento.
     */

    try {

      document.dispatchEvent(
        new CustomEvent(
          "recordatorioDatabaseUpdated",
          {
            detail: {
              records:
                clone(database.records),

              trash:
                clone(database.trash)
            }
          }
        )
      );

    } catch (error) {

      console.warn(
        "Erro ao comunicar com app.js:",
        error
      );

    }


    /*
     * Tentamos atualizar as telas, se essas
     * funções estiverem disponíveis.
     */

    const functions = [
      "renderDashboard",
      "renderDiary",
      "renderConsultations",
      "renderTrash"
    ];


    functions.forEach(
      function (name) {

        try {

          if (
            typeof window[name] ===
            "function"
          ) {

            window[name]();

          }

        } catch (error) {

          console.warn(
            "Erro ao executar " +
            name +
            ":",
            error
          );

        }

      }
    );

  }


  /* =====================================================
     CONVERTER LOCAL → SUPABASE
  ====================================================== */

  function toCloudRow(
    record,
    userId,
    excluded
  ) {

    const now =
      nowISO();

    const updatedAt =
      record.updatedAt ||
      record.deletedAt ||
      record.createdAt ||
      now;


    return {

      user_id:
        userId,

      local_id:
        String(record.id),

      data:
        record.date ||
        null,

      tipo:
        record.type ||
        null,

      dados:
        clone(record),

      excluido:
        Boolean(excluded),

      atualizado_em:
        updatedAt

    };

  }


  /* =====================================================
     CONVERTER SUPABASE → LOCAL
  ====================================================== */

  function fromCloudRow(
    row
  ) {

    const record =
      row &&
      row.dados &&
      typeof row.dados === "object"
        ? clone(row.dados)
        : {};


    record.id =
      row.local_id ||
      record.id ||
      "";


    if (!record.date) {

      record.date =
        row.data ||
        "";

    }


    if (!record.type) {

      record.type =
        row.tipo ||
        "";

    }


    if (
      row.atualizado_em
    ) {

      record.updatedAt =
        row.atualizado_em;

    }


    if (
      row.criado_em &&
      !record.createdAt
    ) {

      record.createdAt =
        row.criado_em;

    }


    if (
      row.excluido
    ) {

      record.deletedAt =
        record.deletedAt ||
        row.atualizado_em ||
        nowISO();

    }


    return record;

  }


  /* =====================================================
     USUÁRIO
  ====================================================== */

  async function getUser() {

    const client =
      getSupabaseClient();

    if (!client) {

      return null;

    }


    try {

      const result =
        await client.auth.getUser();


      if (
        result.data &&
        result.data.user
      ) {

        return result.data.user;

      }


      return null;

    } catch (error) {

      console.error(
        "Erro ao obter usuário:",
        error
      );

      return null;

    }

  }


  /* =====================================================
     MAPA LOCAL
  ====================================================== */

  function buildLocalMap(
    database
  ) {

    const map =
      new Map();


    function add(
      record,
      excluded
    ) {

      const id =
        ensureId(record);

      if (!id) {

        return;

      }


      const current =
        map.get(id);


      const item = {

        record:
          clone(record),

        excluded:
          Boolean(excluded),

        time:
          timestamp(record)

      };


      if (
        !current ||
        item.time >= current.time
      ) {

        map.set(
          id,
          item
        );

      }

    }


    database.records.forEach(
      function (record) {

        add(
          record,
          false
        );

      }
    );


    database.trash.forEach(
      function (record) {

        add(
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

  async function loadCloud(
    userId
  ) {

    const client =
      getSupabaseClient();

    if (!client) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    const result =
      await client
        .from("registros")
        .select(
          "id,user_id,local_id,data,tipo,dados,criado_em,atualizado_em,excluido"
        )
        .eq(
          "user_id",
          userId
        );


    if (result.error) {

      throw result.error;

    }


    return result.data || [];

  }


  /* =====================================================
     MAPA DA NUVEM
  ====================================================== */

  function buildCloudMap(
    rows
  ) {

    const map =
      new Map();


    rows.forEach(
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
          fromCloudRow(
            row
          );


        const cloudTime =
          row.atualizado_em
            ? new Date(
                row.atualizado_em
              ).getTime()
            : timestamp(record);


        const current =
          map.get(id);


        if (
          !current ||
          cloudTime >= current.time
        ) {

          map.set(
            id,
            {

              record,

              excluded:
                Boolean(
                  row.excluido
                ),

              time:
                cloudTime

            }
          );

        }

      }
    );


    return map;

  }


  /* =====================================================
     MESCLAR
  ====================================================== */

  function merge(
    localMap,
    cloudRows
  ) {

    const result =
      new Map(
        localMap
      );


    const cloudMap =
      buildCloudMap(
        cloudRows
      );


    cloudMap.forEach(
      function (
        cloudItem,
        id
      ) {

        const localItem =
          result.get(id);


        if (!localItem) {

          result.set(
            id,
            {

              record:
                clone(
                  cloudItem.record
                ),

              excluded:
                cloudItem.excluded,

              time:
                cloudItem.time

            }
          );

          return;

        }


        const localTime =
          localItem.time ||
          timestamp(
            localItem.record
          );


        if (
          cloudItem.time >
          localTime
        ) {

          result.set(
            id,
            {

              record:
                clone(
                  cloudItem.record
                ),

              excluded:
                cloudItem.excluded,

              time:
                cloudItem.time

            }
          );

        }

      }
    );


    return result;

  }


  /* =====================================================
     MAPA → DATABASE
  ====================================================== */

  function mapToDatabase(
    map
  ) {

    const records = [];
    const trash = [];


    map.forEach(
      function (item) {

        if (
          !item ||
          !item.record ||
          !item.record.id
        ) {

          return;

        }


        const record =
          clone(item.record);


        if (
          item.excluded
        ) {

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

          delete record.deletedAt;

          records.push(
            record
          );

        }

      }
    );


    records.sort(
      function (a, b) {

        const dateCompare =
          String(
            a.date || ""
          ).localeCompare(
            String(
              b.date || ""
            )
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


    trash.sort(
      function (a, b) {

        return timestamp(b) -
               timestamp(a);

      }
    );


    return {
      records,
      trash
    };

  }


  /* =====================================================
     ENVIAR PARA SUPABASE
  ====================================================== */

  async function upload(
    map,
    userId
  ) {

    const client =
      getSupabaseClient();

    if (!client) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    const rows = [];


    map.forEach(
      function (item) {

        if (
          !item ||
          !item.record ||
          !item.record.id
        ) {

          return;

        }


        rows.push(
          toCloudRow(
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
      await client
        .from("registros")
        .upsert(
          rows,
          {
            onConflict:
              "user_id,local_id"
          }
        );


    if (result.error) {

      throw result.error;

    }

  }


  /* =====================================================
     SINCRONIZAÇÃO PRINCIPAL
  ====================================================== */

  async function sync(
    reason
  ) {

    if (syncing) {

      return;

    }


    if (
      !navigator.onLine
    ) {

      console.log(
        "Sem internet. Sincronização aguardará conexão."
      );

      return;

    }


    const client =
      getSupabaseClient();

    if (!client) {

      return;

    }


    syncing = true;


    try {

      const user =
        await getUser();


      if (!user) {

        console.log(
          "Nenhum usuário autenticado."
        );

        return;

      }


      /*
       * Banco local atual.
       */

      const localDatabase =
        loadLocalDatabase();


      const localMap =
        buildLocalMap(
          localDatabase
        );


      /*
       * Banco remoto.
       */

      const cloudRows =
        await loadCloud(
          user.id
        );


      /*
       * União.
       */

      const mergedMap =
        merge(
          localMap,
          cloudRows
        );


      const mergedDatabase =
        mapToDatabase(
          mergedMap
        );


      /*
       * Salva localmente.
       */

      saveLocalDatabase(
        mergedDatabase
      );


      /*
       * Atualiza o aplicativo.
       */

      notifyApp(
        mergedDatabase
      );


      /*
       * Envia para o Supabase.
       */

      await upload(
        mergedMap,
        user.id
      );


      console.log(
        "Sincronização concluída:",
        reason,
        {
          registros:
            mergedDatabase.records.length,

          lixeira:
            mergedDatabase.trash.length,

          remoto:
            cloudRows.length,

          total:
            mergedMap.size
        }
      );


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

      } catch (_) {}


    } catch (error) {

      console.error(
        "ERRO NA SINCRONIZAÇÃO:",
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

      return false;

    }


    const originalSaveDatabase =
      window.saveDatabase;


    window.saveDatabase =
      function () {

        const result =
          originalSaveDatabase.apply(
            this,
            arguments
          );


        setTimeout(
          function () {

            sync(
              "salvamento"
            );

          },
          300
        );


        return result;

      };


    saveHookInstalled =
      true;


    console.log(
      "Hook de sincronização instalado."
    );


    return true;

  }


  function waitForSaveDatabase() {

    if (
      installSaveHook()
    ) {

      return;

    }


    setTimeout(
      waitForSaveDatabase,
      500
    );

  }


  /* =====================================================
     AUTH
  ====================================================== */

  function installAuthListener() {

    if (
      authListenerInstalled
    ) {

      return;

    }


    const client =
      getSupabaseClient();

    if (!client) {

      return;

    }


    if (
      !client.auth ||
      typeof client.auth.onAuthStateChange !==
        "function"
    ) {

      return;

    }


    authListenerInstalled =
      true;


    client.auth.onAuthStateChange(
      function (
        event,
        session
      ) {

        console.log(
          "Sincronização Auth:",
          event
        );


        if (
          event ===
          "SIGNED_IN"
        ) {

          if (session) {

            setTimeout(
              function () {

                sync(
                  "login"
                );

              },
              500
            );

          }

        }


        if (
          event ===
          "INITIAL_SESSION"
        ) {

          if (session) {

            setTimeout(
              function () {

                sync(
                  "sessao_inicial"
                );

              },
              800
            );

          }

        }

      }
    );

  }


  /* =====================================================
     EVENTOS DO NAVEGADOR
  ====================================================== */

  function installBrowserListeners() {

    document.addEventListener(
      "visibilitychange",
      function () {

        if (
          document.visibilityState ===
          "visible"
        ) {

          setTimeout(
            function () {

              sync(
                "pagina_visivel"
              );

            },
            500
          );

        }

      }
    );


    window.addEventListener(
      "online",
      function () {

        setTimeout(
          function () {

            sync(
              "internet_restaurada"
            );

          },
          500
        );

      }
    );


    window.addEventListener(
      "focus",
      function () {

        setTimeout(
          function () {

            sync(
              "foco"
            );

          },
          500
        );

      }
    );

  }


  /* =====================================================
     SINCRONIZAÇÃO PERIÓDICA
  ====================================================== */

  function installPeriodicSync() {

    if (periodicTimer) {

      clearInterval(
        periodicTimer
      );

    }


    periodicTimer =
      setInterval(
        function () {

          sync(
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

      return sync(
        "manual"
      );

    };


  /* =====================================================
     INICIALIZAÇÃO
  ====================================================== */

  function init() {

    console.log(
      "Sincronização Supabase iniciada."
    );


    waitForSaveDatabase();

    installAuthListener();

    installBrowserListeners();

    installPeriodicSync();


    setTimeout(
      function () {

        sync(
          "inicializacao"
        );

      },
      1500
    );

  }


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
