package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp crea una nueva estructura de aplicación
func NewApp() *App {
	return &App{}
}

// startup se llama cuando la aplicación se inicializa
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ProductData estructura los datos enviados por el frontend para hacer match con el AppScript
type ProductData struct {
	Nombre      string  `json:"nombre"`
	CostoFinal  float64 `json:"costoFinal"`
	PrecioFinal float64 `json:"precioFinal"`
	PrecioMayor float64 `json:"precioMayor"`
	Imagen      string  `json:"imagen"`
}

// SelectImage abre el explorador nativo, lee el archivo y lo devuelve en formato Data URI (Base64)
func (a *App) SelectImage() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Selecciona una foto de la pieza impresa",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Imágenes (*.png, *.jpg, *.jpeg)",
				Pattern:     "*.png;*.jpg;*.jpeg",
			},
		},
	})

	if err != nil {
		return "", fmt.Errorf("error al abrir el explorador de archivos: %v", err)
	}
	
	// Si el usuario cancela o cierra la ventana
	if selection == "" {
		return "", nil 
	}

	// Leer los bytes del archivo seleccionado
	fileBytes, err := os.ReadFile(selection)
	if err != nil {
		return "", fmt.Errorf("error al leer la imagen: %v", err)
	}

	// Determinar el MimeType (AppScript usa esto para decodificar)
	mimeType := "image/jpeg"
	ext := strings.ToLower(filepath.Ext(selection))
	if ext == ".png" {
		mimeType = "image/png"
	}

	// Codificar a Base64 y armar el string compatible con el AppScript
	base64Str := base64.StdEncoding.EncodeToString(fileBytes)
	return fmt.Sprintf("data:%s;base64,%s", mimeType, base64Str), nil
}

// SaveToSheets procesa el struct y lo envía al Google Apps Script de forma segura
func (a *App) SaveToSheets(data ProductData) (string, error) {
	// REEMPLAZA ESTA VARIABLE CON LA URL DE TU APPS SCRIPT
	scriptURL := "https://script.google.com/macros/s/AKfycbxT_p3Wm4yWny5TO0O6X8_poR9k71plf0vs3Olc5Tvi_hogKivoxnNiP273HT4jF0eKBg/exec"

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("error al empaquetar los datos: %v", err)
	}

	req, err := http.NewRequest("POST", scriptURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("error al preparar la solicitud HTTP: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Petición HTTP nativa desde Go
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("no se pudo conectar con Google Sheets: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("el servidor de Google respondió con un error de estado: %d", resp.StatusCode)
	}

	return "Datos guardados correctamente", nil
}