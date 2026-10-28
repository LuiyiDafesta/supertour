<?php
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', '300');
@ini_set('post_max_size', '64M');
@ini_set('upload_max_filesize', '64M');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Backblaze B2 Credentials
$keyId = "00429a18a8ece8c0000000006";
$applicationKey = "K004dFQArQ0gYGBE0al0wxP2zxk/G8k";
$bucketId = "9299dad1580a680e9cee081c";
$bucketName = "SupertourLow";
$cdnDomain = "https://media.supertourchannel.com.ar";

function getB2Auth($keyId, $applicationKey) {
    $credentials = base64_encode("$keyId:$applicationKey");
    $ch = curl_init("https://api.backblazeb2.com/b2api/v2/b2_authorize_account");
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Basic $credentials"]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        throw new Exception("B2 Auth connection failed: " . curl_error($ch));
    }
    curl_close($ch);
    $authData = json_decode($response, true);
    if (!isset($authData['authorizationToken'])) {
        throw new Exception("B2 Auth error: " . ($authData['message'] ?? $response));
    }
    return $authData;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        exit;
    }

    // =========================================================================
    // CASO 1: Subida simple de archivos chicos (< 10MB)
    // =========================================================================
    if ($action === 'single_upload') {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "No se recibió archivo o hubo error en subida"]);
            exit;
        }

        $file = $_FILES['file'];
        $fileName = $_POST['filename'] ?? basename($file['name']);
        $fileName = preg_replace('/[^a-zA-Z0-9.\-\_\/]/', '_', $fileName);

        $authData = getB2Auth($keyId, $applicationKey);
        $apiUrl = $authData['apiUrl'];
        $authToken = $authData['authorizationToken'];

        $ch = curl_init("$apiUrl/b2api/v2/b2_get_upload_url");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["bucketId" => $bucketId]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: $authToken",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        $upData = json_decode($response, true);
        if (!isset($upData['uploadUrl'])) {
            throw new Exception("Error al obtener URL de subida de B2");
        }

        $fileData = file_get_contents($file['tmp_name']);
        $sha1 = sha1($fileData);

        $ch = curl_init($upData['uploadUrl']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $fileData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: " . $upData['authorizationToken'],
            "X-Bz-File-Name: " . rawurlencode($fileName),
            "Content-Type: " . ($file['type'] ?: 'video/mp4'),
            "Content-Length: " . strlen($fileData),
            "X-Bz-Content-Sha1: $sha1"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $uploadRes = curl_exec($ch);
        curl_close($ch);
        $resObj = json_decode($uploadRes, true);

        if (!isset($resObj['fileId'])) {
            throw new Exception("Error al subir archivo a B2: " . ($resObj['message'] ?? $uploadRes));
        }

        echo json_encode([
            "success" => true,
            "fileId" => $resObj['fileId'],
            "url" => "$cdnDomain/$bucketName/$fileName"
        ]);
        exit;
    }

    // =========================================================================
    // CASO 2: Iniciar archivo grande (Large File)
    // =========================================================================
    if ($action === 'start') {
        $fileName = $_POST['filename'] ?? '';
        $contentType = $_POST['contentType'] ?? 'video/mp4';
        if (!$fileName) {
            http_response_code(400);
            echo json_encode(["error" => "Falta filename"]);
            exit;
        }

        $fileName = preg_replace('/[^a-zA-Z0-9.\-\_\/]/', '_', $fileName);
        $authData = getB2Auth($keyId, $applicationKey);
        $apiUrl = $authData['apiUrl'];
        $authToken = $authData['authorizationToken'];

        $ch = curl_init("$apiUrl/b2api/v2/b2_start_large_file");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            "bucketId" => $bucketId,
            "fileName" => $fileName,
            "contentType" => $contentType
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: $authToken",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);

        $startData = json_decode($response, true);
        if (!isset($startData['fileId'])) {
            throw new Exception("Error al iniciar archivo grande B2: " . ($startData['message'] ?? $response));
        }

        echo json_encode([
            "success" => true,
            "fileId" => $startData['fileId'],
            "fileName" => $fileName
        ]);
        exit;
    }

    // =========================================================================
    // CASO 3: Subir una parte / chunk
    // =========================================================================
    if ($action === 'upload_part') {
        $fileId = $_POST['fileId'] ?? '';
        $partNumber = intval($_POST['partNumber'] ?? 0);

        if (!$fileId || $partNumber < 1 || $partNumber > 10000) {
            http_response_code(400);
            echo json_encode(["error" => "Parámetros inválidos (fileId o partNumber)"]);
            exit;
        }

        if (!isset($_FILES['chunk']) || $_FILES['chunk']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "No se recibió el fragmento o hubo error en el chunk"]);
            exit;
        }

        $authData = getB2Auth($keyId, $applicationKey);
        $apiUrl = $authData['apiUrl'];
        $authToken = $authData['authorizationToken'];

        // Obtener upload part URL
        $ch = curl_init("$apiUrl/b2api/v2/b2_get_upload_part_url");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["fileId" => $fileId]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: $authToken",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);

        $partUrlData = json_decode($response, true);
        if (!isset($partUrlData['uploadUrl'])) {
            throw new Exception("Error al obtener URL de parte de B2: " . ($partUrlData['message'] ?? $response));
        }

        $chunkData = file_get_contents($_FILES['chunk']['tmp_name']);
        $chunkSha1 = sha1($chunkData);
        $chunkLen = strlen($chunkData);

        // Subir parte a Backblaze B2
        $ch = curl_init($partUrlData['uploadUrl']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $chunkData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: " . $partUrlData['authorizationToken'],
            "X-Bz-Part-Number: $partNumber",
            "Content-Length: $chunkLen",
            "X-Bz-Content-Sha1: $chunkSha1"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        $uploadPartRes = curl_exec($ch);
        curl_close($ch);

        $partResData = json_decode($uploadPartRes, true);
        if (!isset($partResData['contentSha1'])) {
            throw new Exception("Error al subir parte $partNumber a B2: " . ($partResData['message'] ?? $uploadPartRes));
        }

        echo json_encode([
            "success" => true,
            "partNumber" => $partNumber,
            "sha1" => $partResData['contentSha1']
        ]);
        exit;
    }

    // =========================================================================
    // CASO 4: Finalizar archivo grande (Finish Large File)
    // =========================================================================
    if ($action === 'finish') {
        $fileId = $_POST['fileId'] ?? '';
        $fileName = $_POST['filename'] ?? '';
        $partSha1Json = $_POST['partSha1Array'] ?? '[]';
        $partSha1Array = json_decode($partSha1Json, true);

        if (!$fileId || !is_array($partSha1Array) || empty($partSha1Array)) {
            http_response_code(400);
            echo json_encode(["error" => "Parámetros inválidos para finish (fileId o partSha1Array vacío)"]);
            exit;
        }

        $authData = getB2Auth($keyId, $applicationKey);
        $apiUrl = $authData['apiUrl'];
        $authToken = $authData['authorizationToken'];

        $ch = curl_init("$apiUrl/b2api/v2/b2_finish_large_file");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            "fileId" => $fileId,
            "partSha1Array" => $partSha1Array
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: $authToken",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);

        $finishData = json_decode($response, true);
        if (!isset($finishData['fileId'])) {
            throw new Exception("Error al finalizar archivo grande en B2: " . ($finishData['message'] ?? $response));
        }

        $cleanName = preg_replace('/[^a-zA-Z0-9.\-\_\/]/', '_', $fileName);
        $publicUrl = "$cdnDomain/$bucketName/$cleanName";

        echo json_encode([
            "success" => true,
            "fileId" => $finishData['fileId'],
            "url" => $publicUrl
        ]);
        exit;
    }

    // Acción no reconocida
    http_response_code(400);
    echo json_encode(["error" => "Acción no válida o no especificada"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
