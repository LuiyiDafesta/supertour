<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// Responder inmediatamente a OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Credenciales Backblaze B2 (mismas que upload.php)
$keyId = "00429a18a8ece8c0000000006";
$applicationKey = "K004dFQArQ0gYGBE0al0wxP2zxk/G8k";
$bucketId = "9299dad1580a680e9cee081c";
$bucketName = "SupertourLow";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Recibir payload por JSON o formulario POST
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true);

$urlsToDelete = [];

if (is_array($inputData)) {
    if (isset($inputData['urls']) && is_array($inputData['urls'])) {
        $urlsToDelete = $inputData['urls'];
    } elseif (isset($inputData['url']) && is_string($inputData['url'])) {
        $urlsToDelete[] = $inputData['url'];
    } elseif (isset($inputData['filename']) && is_string($inputData['filename'])) {
        $urlsToDelete[] = $inputData['filename'];
    }
}

if (isset($_POST['urls']) && is_array($_POST['urls'])) {
    $urlsToDelete = array_merge($urlsToDelete, $_POST['urls']);
}
if (isset($_POST['url']) && is_string($_POST['url'])) {
    $urlsToDelete[] = $_POST['url'];
}
if (isset($_POST['filename']) && is_string($_POST['filename'])) {
    $urlsToDelete[] = $_POST['filename'];
}

$urlsToDelete = array_values(array_filter(array_unique($urlsToDelete)));

if (empty($urlsToDelete)) {
    echo json_encode(["success" => true, "deleted" => [], "message" => "No URLs provided"]);
    exit;
}

// Función para extraer el nombre del objeto B2 a partir de la URL del CDN o Backblaze
function extractB2FileName($url, $bucketName) {
    if (!is_string($url) || trim($url) === '') return null;
    $url = trim($url);

    // Si ya es una ruta relativa directa sin protocolo
    if (strpos($url, 'http://') !== 0 && strpos($url, 'https://') !== 0) {
        $clean = ltrim($url, '/');
        if (strpos($clean, $bucketName . '/') === 0) {
            $clean = substr($clean, strlen($bucketName) + 1);
        }
        return $clean;
    }

    $parsed = parse_url($url);
    if (!isset($parsed['path'])) return null;

    $path = ltrim($parsed['path'], '/');

    // Caso 1: https://media.supertourchannel.com.ar/SupertourLow/schools-gallery/...
    // Caso 2: https://f004.backblazeb2.com/file/SupertourLow/schools-gallery/...
    // Caso 3: https://s3.us-west-004.backblazeb2.com/SupertourLow/...
    if (strpos($path, 'file/' . $bucketName . '/') === 0) {
        return substr($path, strlen('file/' . $bucketName . '/'));
    }

    if (strpos($path, $bucketName . '/') === 0) {
        return substr($path, strlen($bucketName . '/'));
    }

    // Caso 4: Virtual-host style https://SupertourLow.s3.../schools-gallery/...
    if (isset($parsed['host']) && stripos($parsed['host'], $bucketName) !== false) {
        return $path;
    }

    // Si es un enlace externo (Unsplash, YouTube, Google Drive, etc.) no pertenece a Backblaze
    return null;
}

$fileNamesToDelete = [];
$ignoredList = [];

foreach ($urlsToDelete as $u) {
    $extracted = extractB2FileName($u, $bucketName);
    if ($extracted) {
        $fileNamesToDelete[] = $extracted;
    } else {
        $ignoredList[] = $u;
    }
}

$fileNamesToDelete = array_values(array_unique($fileNamesToDelete));

if (empty($fileNamesToDelete)) {
    echo json_encode([
        "success" => true,
        "deleted" => [],
        "ignored" => $ignoredList,
        "message" => "No matching B2 files found in payload"
    ]);
    exit;
}

// Paso 1: Autorizar con Backblaze B2 API
$credentials = base64_encode("$keyId:$applicationKey");
$ch = curl_init("https://api.backblazeb2.com/b2api/v2/b2_authorize_account");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Basic $credentials"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
$authResponse = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "B2 Auth connection failed", "details" => curl_error($ch)]);
    exit;
}
curl_close($ch);

$authData = json_decode($authResponse, true);
if (!isset($authData['authorizationToken']) || !isset($authData['apiUrl'])) {
    http_response_code(500);
    echo json_encode(["error" => "B2 Authorization failed", "details" => $authData]);
    exit;
}

$authToken = $authData['authorizationToken'];
$apiUrl = $authData['apiUrl'];

$deletedFiles = [];
$deleteErrors = [];

// Paso 2: Para cada archivo objetivo, listar versiones y eliminarlas
foreach ($fileNamesToDelete as $targetFileName) {
    try {
        $chList = curl_init("$apiUrl/b2api/v2/b2_list_file_versions");
        curl_setopt($chList, CURLOPT_POST, true);
        curl_setopt($chList, CURLOPT_POSTFIELDS, json_encode([
            "bucketId" => $bucketId,
            "startFileName" => $targetFileName,
            "maxFileCount" => 10,
            "prefix" => $targetFileName
        ]));
        curl_setopt($chList, CURLOPT_HTTPHEADER, [
            "Authorization: $authToken",
            "Content-Type: application/json"
        ]);
        curl_setopt($chList, CURLOPT_RETURNTRANSFER, true);
        $listResponse = curl_exec($chList);
        curl_close($chList);

        $listData = json_decode($listResponse, true);

        if (isset($listData['files']) && is_array($listData['files'])) {
            foreach ($listData['files'] as $item) {
                if ($item['fileName'] === $targetFileName) {
                    $chDel = curl_init("$apiUrl/b2api/v2/b2_delete_file_version");
                    curl_setopt($chDel, CURLOPT_POST, true);
                    curl_setopt($chDel, CURLOPT_POSTFIELDS, json_encode([
                        "fileName" => $item['fileName'],
                        "fileId" => $item['fileId']
                    ]));
                    curl_setopt($chDel, CURLOPT_HTTPHEADER, [
                        "Authorization: $authToken",
                        "Content-Type: application/json"
                    ]);
                    curl_setopt($chDel, CURLOPT_RETURNTRANSFER, true);
                    curl_exec($chDel);
                    curl_close($chDel);

                    $deletedFiles[] = $targetFileName;
                }
            }
        }
    } catch (Exception $e) {
        $deleteErrors[] = ["file" => $targetFileName, "error" => $e->getMessage()];
    }
}

echo json_encode([
    "success" => true,
    "deleted" => array_values(array_unique($deletedFiles)),
    "ignored" => $ignoredList,
    "errors" => $deleteErrors
]);
?>
