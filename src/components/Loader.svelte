<div class="loader-container">
  <div class="loader-wrapper">
      <div class="loader"></div>
  </div>
</div>

<style>
  .loader-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh; /* Ajusta esto según sea necesario */
  }

  .loader-wrapper {
      height: 4rem; /* Equivalente a h-16 */
      width: 4rem; /* Equivalente a w-16 */
      position: relative;
  }

  .loader {
      border: 4px solid #f3f3f3; /* border-gray-200 */
      border-top: 4px solid #3498db; /* border-top-color */
      border-radius: 50%; /* rounded-full */
      width: 3rem; /* Equivalente a h-12 */
      height: 3rem; /* Equivalente a w-12 */
      margin-bottom: 1rem; /* mb-4 */
      animation: spinner 1.5s linear infinite;
  }

  @keyframes spinner {
      0% {
          transform: rotate(0deg);
      }
      100% {
          transform: rotate(360deg);
      }
  }
</style>