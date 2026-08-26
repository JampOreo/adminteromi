const TARIFA_KWH = 120.00;
const COSTO_PEGAMENTO = 500.00;
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1iyLPQqAeUqe-mXAOX9-uiUKSWR1YegvMRhkoKfCu5NY/edit?usp=sharing";

let calculatedData = {};
let currentImageBase64 = "";

// Función para cambiar pantallas
function goToScreen(screenNumber) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if(screenNumber === 1) document.getElementById('screen1').classList.add('active');
    if(screenNumber === 2) document.getElementById('screen2').classList.add('active');
    if(screenNumber === 2.5) document.getElementById('screenResult').classList.add('active');
    if(screenNumber === 3) document.getElementById('screen3').classList.add('active');
}

// Sistema de Notificaciones Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Animar salida y destruir
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Llamada nativa para el explorador de archivos
async function handleImageUpload() {
    const label = document.getElementById('fileUploadLabel');
    label.innerText = "⏳ Abriendo explorador...";
    
    try {
        // Llamada a la función Go (SelectImage)
        const base64Img = await window.go.main.App.SelectImage();
        
        if (base64Img && base64Img !== "") {
            currentImageBase64 = base64Img;
            label.innerText = "✅ Imagen seleccionada correctamente";
            showToast("Imagen cargada y optimizada", "success");
        } else {
            // Si el usuario canceló la selección de archivo
            label.innerText = "📷 Clic aquí para adjuntar foto de la pieza";
        }
    } catch (err) {
        showToast("Error al procesar la imagen", "error");
        label.innerText = "❌ Error al cargar. Intenta de nuevo.";
        console.error(err);
    }
}

// Cálculos matemáticos puros (Sin cambios en tu lógica)
function calculatePrice(event) {
    event.preventDefault();

    if (!currentImageBase64) {
        showToast("Debes seleccionar una imagen primero", "error");
        return;
    }

    const nombre = document.getElementById('nombrePieza').value;
    const precioKg = parseFloat(document.getElementById('precioFilamento').value) || 0;
    const gramos = parseFloat(document.getElementById('filamentoUsado').value) || 0;
    const horas = parseFloat(document.getElementById('horasImpresion').value) || 0;
    const minutos = parseFloat(document.getElementById('minutosImpresion').value) || 0;
    const postMinutos = parseFloat(document.getElementById('tiempoPostProceso').value) || 0;
    const tasaFalloPct = parseFloat(document.getElementById('tasaFallo').value) || 0;
    const impresora = document.getElementById('impresora').value;
    const adicionales = parseFloat(document.getElementById('elementosAdicionales').value) || 0;

    const costoMaterial = (precioKg / 1000) * gramos;
    const tiempoImpresionHoras = horas + (minutos / 60);
    const consumoKW = impresora === "Kobra 2 Neo" ? 0.12 : 0.18;
    const costoElectricidad = tiempoImpresionHoras * consumoKW * TARIFA_KWH;

    let desgastePorHora = 150;
    if (tiempoImpresionHoras > 8) desgastePorHora = 200;
    const costoDesgaste = tiempoImpresionHoras * desgastePorHora;

    const costoPostProceso = (postMinutos / 60) * 3000;
    let subtotal = costoMaterial + costoElectricidad + costoDesgaste + costoPostProceso + adicionales + COSTO_PEGAMENTO;
    
    const costoFinal = subtotal * (1 + (tasaFalloPct / 100));
    const precioFinal = costoFinal * 2;
    const precioMayor = costoFinal * 1.75;

    // Estructuramos datos para empatar con ProductData en Go
    calculatedData = {
        nombre: nombre,
        costoFinal: costoFinal,
        precioFinal: precioFinal,
        precioMayor: precioMayor,
        imagen: currentImageBase64
    };

    // Renderizar
    document.getElementById('resNombrePieza').innerText = nombre;
    document.getElementById('resCostoFinal').innerText = "$ " + costoFinal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('resPrecioFinal').innerText = "$ " + precioFinal.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('resPrecioMayor').innerText = "$ " + precioMayor.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('previewImage').src = currentImageBase64;

    goToScreen(2.5);
}

// Comunicación Backend Go para enviar datos
async function guardarEnSpreadsheet() {
    const btn = document.getElementById('btnSave');
    const text = document.getElementById('btnSaveText');
    const spinner = document.getElementById('btnSaveSpinner');

    // Estado visual de carga
    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        // Llamada a la función Go (SaveToSheets)
        const responseMessage = await window.go.main.App.SaveToSheets(calculatedData);
        
        showToast(responseMessage, 'success');
        
        // Limpiamos el formulario y la imagen cargada
        document.getElementById('calcForm').reset();
        currentImageBase64 = "";
        document.getElementById('fileUploadLabel').innerText = "📷 Clic aquí para adjuntar foto de la pieza";
        
        goToScreen(3);
    } catch (error) {
        // En Wails los errores de Go llegan directamente al catch de JS
        showToast("Error del sistema: " + error, 'error');
        console.error(error);
    } finally {
        // Restaurar botón
        btn.disabled = false;
        text.style.display = 'inline-block';
        spinner.style.display = 'none';
    }
}

// Abre URLs usando el navegador nativo de la PC (Windows/Mac/Linux) 
// evitando abrir páginas web dentro del contenedor de Wails
function abrirSpreadsheet() {
    window.runtime.BrowserOpenURL(SPREADSHEET_URL);
}
// ====== AÑADIR AL FINAL DE main.js ======
// Exponer funciones al scope global para que el HTML pueda usarlas tras la compilación
window.goToScreen = goToScreen;
window.showToast = showToast;
window.handleImageUpload = handleImageUpload;
window.calculatePrice = calculatePrice;
window.guardarEnSpreadsheet = guardarEnSpreadsheet;
window.abrirSpreadsheet = abrirSpreadsheet;