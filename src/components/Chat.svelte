<script>
  import { marked } from "marked";
  import { onMount } from "svelte";
  import hljs from "highlight.js";
  import "highlight.js/styles/base16/atelier-dune.min.css";
  import "../style/chat.css";

  // Variables de estado
  let prompt = "";
  let load = false;
  let escribiendoBot = false;
  let mensajes = [];
  let historial = [];
  let conversacionId = null;
  let tituloSeleccionado = "Nueva conversación";
  let mensajesContainer;
  let editandoId = null;
  let nuevoTitulo = "";
  let sidebarVisible = true;
  let cargandoConversacion = true;
  let userScrolled = false;
  

  // Configuración de marked y highlight.js
  marked.setOptions({
    highlight: function (code, lang) {
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  });

  // Función para procesar mensajes y detectar código
  function procesarMensaje(mensaje) {
    if (!mensaje.contenido) return mensaje;

    const contieneCodigo = mensaje.contenido.includes("```");
    return {
      ...mensaje,
      contieneCodigo,
      contenidoHtml: contieneCodigo
        ? marked.parse(mensaje.contenido)
        : mensaje.contenido,
    };
  }

  // Función para hacer scroll al final
  function scrollToBottom(force = false) {
    if (!mensajesContainer) return;
    if (force || !userScrolled) {
      requestAnimationFrame(() => {
        mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
      });
    }
  }

  // Función para enviar mensajes
  const apiSubmit = async () => {
    if (!prompt.trim() || load) return;

    const nuevoMensajeUsuario = {
      rol: "user",
      contenido: prompt,
      contieneCodigo: false,
    };

    mensajes = [...mensajes, nuevoMensajeUsuario];
    scrollToBottom();

    const typingBot = {
      rol: "assistant",
      contenido: "__CARGANDO__",
      contieneCodigo: false,
    };

    mensajes = [...mensajes, typingBot];
    load = true;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mensajes,
          conversacionId,
          titulo:
            tituloSeleccionado === "Nueva conversación"
              ? prompt.slice(0, 30)
              : undefined,
        }),
      });

      const data = await response.json();

      if (data.reply) {
        conversacionId = data.conversacionId || conversacionId;
        tituloSeleccionado = data.titulo || tituloSeleccionado;

        // Eliminar el "..." temporal
        mensajes.pop();

        const nuevoMensaje = {
          rol: "assistant",
          contenido: "",
          contieneCodigo: false,
        };
        mensajes = [...mensajes, nuevoMensaje];

        let i = 0;
        const textoFinal = data.reply;
        escribiendoBot = true;

        const interval = setInterval(() => {
          if (i > textoFinal.length) {
            clearInterval(interval);
            nuevoMensaje.contenido = textoFinal;
            mensajes[mensajes.length - 1] = procesarMensaje(nuevoMensaje);
            scrollToBottom(true);
            obtenerHistorial();
            load = false;
            escribiendoBot = false;
            return;
          }

          const parcial = textoFinal.slice(0, i);
          nuevoMensaje.contenido = parcial + "‌|";
          mensajes[mensajes.length - 1] = procesarMensaje(nuevoMensaje);
          scrollToBottom();
          i++;
        }, 5);

        // Quitar cursor al final
        nuevoMensaje.contenido = textoFinal;
        mensajes[mensajes.length - 1] = procesarMensaje(nuevoMensaje);
        scrollToBottom();

        // Cuando termina, quitar el cursor
        nuevoMensaje.contenido = textoFinal;
        mensajes[mensajes.length - 1] = procesarMensaje(nuevoMensaje);
        scrollToBottom();

        await obtenerHistorial();
      }
    } catch (error) {
      mensajes[mensajes.length - 1] = {
        rol: "assistant",
        contenido: "❌ Error al contactar el servidor.",
        contieneCodigo: false,
      };
    } finally {
      load = false;
      prompt = "";
    }
  };

  // Obtener historial de conversaciones
  const obtenerHistorial = async () => {
    try {
      const res = await fetch("/api/historial");
      const data = await res.json();
      historial = data.historial || [];
      return historial;
    } catch (err) {
      console.error("No se pudo obtener el historial:", err);
      return [];
    }
  };

  // Cargar una conversación específica
  const cargarConversacion = async (id, titulo) => {
    
    cargandoConversacion = true;
    conversacionId = id;
    tituloSeleccionado = titulo || "Sin título";
    sidebarVisible = false;
    sidebar?.classList.remove('show');

    localStorage.setItem("ultimaConversacion", id); // ✅ guarda la última

    try {
      const res = await fetch(`/api/historial?id=${id}`);
      const data = await res.json();

      if (data.mensajes) {
        mensajes = data.mensajes.flat().map((m) => procesarMensaje(m));
      } else {
        mensajes = [];
      }

      //await fetch(`/api/conversaciones/${id}/actividad`, { method: "POST" });
    } catch (err) {
      console.error("No se pudo cargar la conversación:", err);
      mensajes = [];
    } finally {
      cargandoConversacion = false;
      scrollToBottom();
    }
  };

  // Crear nueva conversación
  const nuevaConversacion = async () => {
    conversacionId = null;
    tituloSeleccionado = "Nueva conversación";
    mensajes = [];
    sidebarVisible = true;
  };

  // Eliminar conversación
  const eliminarConversacion = async (id) => {
    const confirmar = confirm("¿Seguro que deseas eliminar esta conversación?");
    if (!confirmar) return;

    try {
      await fetch("/api/historial", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (conversacionId === id) {
        await nuevaConversacion();
      }

      await obtenerHistorial();
    } catch (err) {
      alert("❌ No se pudo eliminar la conversación.");
    }
  };

  // Editar título de conversación
  const guardarTitulo = async (id) => {
    if (!nuevoTitulo.trim()) {
      editandoId = null;
      return;
    }

    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nuevoTitulo }),
      });

      editandoId = null;
      nuevoTitulo = "";

      // Actualizar título en la vista si es la conversación actual
      if (conversacionId === id) {
        tituloSeleccionado = nuevoTitulo;
      }

      await obtenerHistorial();
    } catch (err) {
      alert("❌ No se pudo actualizar el título.");
    }
  };

  let sidebar;
let toggleBtn;

  // Inicialización del componente
  onMount(async () => {
  const toggleBtn = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  const handleToggle = () => {
    sidebar?.classList.toggle('show');
  };

  const handleOutsideClick = (e) => {
    if (
      sidebar &&
      !sidebar.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      sidebar.classList.remove('show');
    }
  };

  // Asignar eventos solo si existen los elementos
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', handleToggle);
    document.addEventListener('click', handleOutsideClick);
  }

  // Scroll tracking del contenedor de mensajes
  mensajesContainer?.addEventListener('scroll', () => {
    const nearBottom =
      mensajesContainer.scrollHeight -
        mensajesContainer.scrollTop -
        mensajesContainer.clientHeight <
      100;
    userScrolled = !nearBottom;
  });

  // Carga del historial de conversaciones
  try {
    const historialData = await obtenerHistorial();
    const ultima = localStorage.getItem("ultimaConversacion");
    const encontrada = historialData.find((c) => c._id === ultima);

    if (encontrada) {
      await cargarConversacion(encontrada._id, encontrada.titulo);
    } else {
      cargandoConversacion = false;
    }
  } catch (err) {
    console.error("Error al inicializar:", err);
    cargandoConversacion = false;
  }

  // Cleanup opcional si Svelte destruye el componente
  return () => {
    document.removeEventListener('click', handleOutsideClick);
    toggleBtn?.removeEventListener('click', handleToggle);
  };

   const textarea = document.querySelector("textarea");
  if (textarea) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    });
  }
});


  // Acción para manejar el contenido HTML y botones de copiar
  function htmlContent(node, { contenido, rol }) {
    if (!contenido) return;

    const procesarNodos = () => {
      node.innerHTML = marked.parse(contenido);

      // Para mensajes planos SIN bloques de código
      const tieneCodigo = node.querySelector("pre code");

      // Si NO tiene bloques de código => es texto plano
      if (!tieneCodigo && (rol === "assistant" || rol === "user")) {
        const existingBtn = node.querySelector(".copiar-btn-plain");
        if (existingBtn) existingBtn.remove();

        const button = document.createElement("button");
        button.className = "copiar-btn-plain";
        button.innerHTML = '<i class="far fa-copy"></i> Copiar';
        button.title = "Copiar mensaje";

        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText(node.innerText);
          button.innerHTML = '<i class="fas fa-check"></i> Copiado';
          setTimeout(() => {
            button.innerHTML = '<i class="far fa-copy"></i> Copiar';
          }, 2000);
        };

        // Botón abajo, centrado
        button.style.display = "block";
        button.style.margin = "8px auto 0";
        button.style.background = "#1f3a3f";
        button.style.color = "#e0f2e9";
        button.style.border = "1px solid #4caf50";
        button.style.borderRadius = "4px";
        button.style.padding = "4px 8px";
        button.style.cursor = "pointer";
        button.style.fontSize = "0.9rem";

        node.appendChild(button);
      }

      // Código existente para bloques con código
      if (tieneCodigo) {
        node.querySelectorAll("pre code").forEach((block) => {
          const existingBtn = block.parentNode.querySelector(".copiar-btn");
          if (existingBtn) existingBtn.remove();

          const button = document.createElement("button");
          button.className = "copiar-btn";
          button.innerHTML = '<i class="far fa-copy"></i>';
          button.title = "Copiar código";

          button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(block.textContent);
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
              button.innerHTML = '<i class="far fa-copy"></i>';
            }, 2000);
          };

          block.parentNode.style.position = "relative";
          block.parentNode.appendChild(button);
        });
      }
    };

    procesarNodos();

    return {
      update({ contenido: newContent, rol: newRol }) {
        if (!newContent) return;
        contenido = newContent;
        rol = newRol;
        procesarNodos();
      },
    };
  }

  async function handleImagenSeleccionada(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("imagen", file);

    // Añade mensaje visual temporal
    mensajes = [
      ...mensajes,
      {
        rol: "user",
        contenido: "__IMG__",
        esImagen: true,
        archivo: URL.createObjectURL(file),
      },
    ];
    scrollToBottom();
    load = true;

    try {
      const res = await fetch("/api/imagen", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Elimina imagen temporal y agrega respuesta
      mensajes = [...mensajes, { rol: "assistant", contenido: data.reply }];
    } catch (err) {
      mensajes = [
        ...mensajes,
        { rol: "assistant", contenido: "❌ Error al analizar la imagen." },
      ];
    } finally {
      load = false;
      scrollToBottom();
    }
  }

</script>

<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
/>
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/atelier-dune.min.css"
/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">


<button
  class="sidebar-toggle"
  onclick={() => (sidebarVisible = !sidebarVisible)}
>
  <i class="fas fa-bars"></i>
</button>

<div class="app-layout">
  <!-- SIDEBAR -->
  <div class:hidden={!sidebarVisible} class="sidebar" bind:this={sidebar}>
    <h3>Conversaciones</h3>
    <button class="new-chat-btn" onclick={nuevaConversacion}>
      <i class="fas fa-plus"></i> Nueva conversación
    </button>

    {#each historial as conv}
      <div class="sidebar-item">
        <div
          style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
        >
          {#if editandoId === conv._id}
            <input
              bind:value={nuevoTitulo}
              onkeydown={(e) => e.key === "Enter" && guardarTitulo(conv._id)}
              onblur={() => guardarTitulo(conv._id)}
              placeholder="Nuevo título..."
              style="width: 80%; padding: 2px;"
            />
          {:else}
            <span
              onclick={() => cargarConversacion(conv._id, conv.titulo)}
              class:active={conv._id === conversacionId}
            >
              🗂 {conv.titulo || "Sin título"}
            </span>
          {/if}
          <div>
            <i
              class="fas fa-edit"
              title="Editar título"
              onclick={() => {
                editandoId = conv._id;
                nuevoTitulo = conv.titulo;
              }}
            ></i>
            <i
              class="fas fa-trash"
              title="Eliminar"
              onclick={() => eliminarConversacion(conv._id)}
            ></i>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- CHAT -->

  <div class="chat-container">
    <div class="chat-panel">
      <h2>{tituloSeleccionado}</h2>

      <div class="chat-content">
        <div class="mensajes" bind:this={mensajesContainer}>
          {#if cargandoConversacion}
            <div class="empty-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>Cargando conversación...</p>
            </div>
          {:else if mensajes.length === 0}
            <div class="empty-state">
              <i class="fas fa-comment-dots"></i>
              <p>Envía un mensaje para comenzar la conversación</p>
            </div>
          {:else}
            {#each mensajes as m}
              {#if m.contenido}
                <div class="mensaje-wrapper {m.rol}">
                  {#if m.rol === "assistant" && m.contenido === "__CARGANDO__"}
                    <div class="burbuja assistant">
                      <i class="fas fa-spinner fa-spin"></i>
                      <span style="margin-left: 8px;">Escribiendo...</span>
                    </div>
                  {:else if m.rol === "assistant" && m.contieneCodigo}
                    <div class="burbuja assistant">
                      <div
                        class="burbuja assistant"
                        use:htmlContent={{ contenido: m.contenido, rol: m.rol }}
                      ></div>
                    </div>
                  {:else}
                    <div
                      class="burbuja {m.rol}"
                      use:htmlContent={{ contenido: m.contenido, rol: m.rol }}
                    ></div>
                  {/if}
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      </div>

      <div class="input-wrapper">
        <div class="input-container">
          <textarea
            bind:value={prompt}
            placeholder="Escribe tu mensaje..."
            autofocus
            onkeydown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!escribiendoBot) apiSubmit();
              }
            }}
          ></textarea>
          <button
            class="send-button"
            onclick={apiSubmit}
            disabled={load ||
              cargandoConversacion ||
              escribiendoBot ||
              !prompt.trim()}
          >
            {#if load}
              <i class="fas fa-spinner fa-spin"></i>
            {:else}
              <i class="fas fa-paper-plane"></i>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
