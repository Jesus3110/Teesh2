<script>
  import Loader from "./Loader.svelte";
  let prompt = "";
  let imageUrl = "";
  let load = false;
  let errorMessage = "";

  const API_KEY =   import.meta.env.PUBLIC_OPENAI_API_KEY;
  const OPENAI_URL = "https://api.openai.com/v1/images/generations";

  const generateImage = async () => {
    if (!prompt.trim()) {
      errorMessage = "⚠️ El prompt no puede estar vacío.";
      return;
    }

    load = true;
    imageUrl = "";
    errorMessage = "";

    const body = {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    };

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log("Respuesta API:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || `Error HTTP: ${response.status}`);
      }

      imageUrl = data.data?.[0]?.url || "";
    } catch (error) {
      console.error("Error en la solicitud:", error);
      errorMessage = `🚨 Error: ${error.message}`;
    } finally {
      load = false;
      prompt = "";
    }
  };
</script>

<style>
  .container {
    max-width: 400px;
    margin: 20px auto;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 20px;
  }

  h2 {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    text-align: center;
  }

  textarea {
    width: 100%;
    border: 2px solid #e91e63;
    border-radius: 5px;
    padding: 10px;
    font-size: 16px;
  }

  button {
    width: 100%;
    padding: 10px;
    background: #e91e63;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    margin-top: 10px;
  }

  button:hover {
    background: #d81b60;
  }

  img {
    width: 100%;
    border-radius: 5px;
    margin-top: 10px;
  }

  .error {
    color: red;
    text-align: center;
    margin-top: 10px;
  }
</style>

<div class="container">
  <h2>Generador de Imágenes</h2>
  <textarea bind:value={prompt} rows="4" placeholder="Describe la imagen que deseas generar"></textarea>

  <div>
    <button on:click={generateImage} class="btn">Generar Imagen</button>
  </div>

  {#if load}
    <Loader />
  {/if}

  {#if imageUrl}
    <img src={imageUrl} alt="Imagen generada por IA" />
  {/if}

  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}
</div>
