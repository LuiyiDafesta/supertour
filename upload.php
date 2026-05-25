<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// Respond immediately to OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Backblaze B2 Credentials (provistos por el usuario)
$keyId = "00429a18a8ece8c0000000006";
$applicationKey = "K004dFQArQ0gYGBE0al0wxP2zxk/G8k";
$bucketId = "9299dad1580a680e9cee081c";
$bucketName = "SupertourLow";
$region = "us-west-004";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["error" => "No file uploaded"]);
    exit;
}

$file = $_FILES['file'];
$fileName = isset($_POST['filename']) ? $_POST['filename'] : basename($file['name']);

// Limpiar el nombre del archivo pero permitir "/" para subdirectorios/carpetas virtuales en S3/B2
$fileName = preg_replace('/[^a-zA-Z0-9.\-\_\/]/', '_', $fileName);

// Paso 1: Autorizar cuenta de Backblaze B2
$credentials = base64_encode("$keyId:$applicationKey");
$ch = curl_init("https://api.backblazeb2.com/b2api/v2/b2_authorize_account");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Basic $credentials"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "B2 Auth connection failed", "details" => curl_error($ch)]);
    exit;
}
curl_close($ch);

$authData = json_decode($response, true);
if (!isset($authData['authorizationToken'])) {
    http_response_code(500);
    echo json_encode(["error" => "B2 Authorization failed", "details" => $authData]);
    exit;
}

$authToken = $authData['authorizationToken'];
$apiUrl = $authData['apiUrl']; // Ejemplo: https://api004.backblazeb2.com

// Paso 2: Obtener URL de carga
$ch = curl_init("$apiUrl/b2api/v2/b2_get_upload_url");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["bucketId" => $bucketId]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: $authToken",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "B2 Get Upload URL connection failed", "details" => curl_error($ch)]);
    exit;
}
curl_close($ch);

$uploadData = json_decode($response, true);
if (!isset($uploadData['uploadUrl'])) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to retrieve B2 Upload URL", "details" => $uploadData]);
    exit;
}

$uploadUrl = $uploadData['uploadUrl'];
$uploadAuthToken = $uploadData['authorizationToken'];

// Paso 3: Subir archivo real
$fileData = file_get_contents($file['tmp_name']);
$sha1 = sha1($fileData);

$ch = curl_init($uploadUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $fileData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: $uploadAuthToken",
    "X-Bz-File-Name: " . rawurlencode($fileName),
    "Content-Type: " . $file['type'],
    "Content-Length: " . strlen($fileData),
    "X-Bz-Content-Sha1: $sha1"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "B2 Upload connection failed", "details" => curl_error($ch)]);
    exit;
}
curl_close($ch);

$result = json_decode($response, true);
if (isset($result['fileId'])) {
    // Generar la URL pública del bucket basada en S3 Backblaze
    $publicUrl = "https://$bucketName.s3.$region.backblazeb2.com/$fileName";
    
    echo json_encode([
        "success" => true,
        "fileId" => $result['fileId'],
        "fileName" => $result['fileName'],
        "url" => $publicUrl
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "B2 Upload failed to return file metadata", "details" => $result]);
}
?>
