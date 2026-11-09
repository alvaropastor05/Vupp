<?php
// Servidor MCP de vupp.es (Streamable HTTP, sin sesiones, solo lectura).
// Se publica en https://vupp.es/mcp mediante una regla de .htaccess.
// Su única herramienta devuelve index.md: no escribe nada ni usa datos del cliente.

ini_set('display_errors', '0');

const SUPPORTED_VERSIONS = array('2025-11-25', '2025-06-18', '2025-03-26');
const ALLOWED_ORIGINS = array('https://vupp.es', 'https://www.vupp.es');
const MAX_BODY_BYTES = 65536;
const TOOL_NAME = 'get_site_content';

function send_json($status, $body)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function send_empty($status)
{
    http_response_code($status);
    exit;
}

function send_result($id, $result)
{
    send_json(200, array('jsonrpc' => '2.0', 'id' => $id, 'result' => $result));
}

function send_error($status, $id, $code, $message)
{
    send_json($status, array(
        'jsonrpc' => '2.0',
        'id' => $id,
        'error' => array('code' => $code, 'message' => $message),
    ));
}

header('Cache-Control: no-store');

// La especificación exige validar Origin. Los clientes sin navegador no lo envían.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    if (!in_array($_SERVER['HTTP_ORIGIN'], ALLOWED_ORIGINS, true)) {
        send_error(403, null, -32000, 'Origin no permitido');
    }
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Vary: Origin');
}

$httpMethod = $_SERVER['REQUEST_METHOD'];

if ($httpMethod === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, MCP-Protocol-Version');
    send_empty(204);
}

// Sin flujo SSE: la especificación indica responder 405 a GET.
if ($httpMethod !== 'POST') {
    header('Allow: POST, OPTIONS');
    send_empty(405);
}

if (isset($_SERVER['HTTP_MCP_PROTOCOL_VERSION'])
    && !in_array($_SERVER['HTTP_MCP_PROTOCOL_VERSION'], SUPPORTED_VERSIONS, true)) {
    send_error(400, null, -32600, 'Versión de protocolo no soportada');
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if ($raw === false || strlen($raw) > MAX_BODY_BYTES) {
    send_error(413, null, -32600, 'Petición demasiado grande');
}

$message = json_decode($raw);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_error(400, null, -32700, 'JSON no válido');
}
if (!is_object($message) || !isset($message->jsonrpc) || $message->jsonrpc !== '2.0') {
    send_error(400, null, -32600, 'Petición JSON-RPC no válida');
}

$hasId = property_exists($message, 'id');

if (!property_exists($message, 'method')) {
    // Respuesta del cliente: no esperamos ninguna, pero se acepta.
    if ($hasId && (property_exists($message, 'result') || property_exists($message, 'error'))) {
        send_empty(202);
    }
    send_error(400, null, -32600, 'Petición JSON-RPC no válida');
}

if (!$hasId) {
    send_empty(202); // Notificación: no lleva respuesta.
}

$id = $message->id;
if ((!is_string($id) && !is_int($id) && !is_float($id)) || !is_string($message->method)) {
    send_error(400, null, -32600, 'Petición JSON-RPC no válida');
}

$params = (isset($message->params) && is_object($message->params)) ? $message->params : new stdClass();

switch ($message->method) {
    case 'initialize':
        $requested = isset($params->protocolVersion) ? $params->protocolVersion : null;
        send_result($id, array(
            'protocolVersion' => in_array($requested, SUPPORTED_VERSIONS, true) ? $requested : SUPPORTED_VERSIONS[0],
            'capabilities' => array('tools' => new stdClass()),
            'serverInfo' => array('name' => 'vupp-site', 'title' => 'Vupp.', 'version' => '1.0.0'),
            'instructions' => 'Información pública de Vupp., productor musical y beatmaker en Las Rozas de Madrid.',
        ));

    case 'ping':
        send_result($id, new stdClass());

    case 'tools/list':
        send_result($id, array('tools' => array(array(
            'name' => TOOL_NAME,
            'title' => 'Contenido de la web de Vupp.',
            'description' => 'Devuelve en Markdown la información pública de Vupp.: cifras, trayectoria, servicios, colaboraciones y enlaces de contacto.',
            'inputSchema' => array(
                'type' => 'object',
                'properties' => new stdClass(),
                'additionalProperties' => false,
            ),
            'annotations' => array(
                'readOnlyHint' => true,
                'destructiveHint' => false,
                'idempotentHint' => true,
                'openWorldHint' => false,
            ),
        ))));

    case 'tools/call':
        if (!isset($params->name) || $params->name !== TOOL_NAME) {
            send_error(200, $id, -32602, 'Herramienta desconocida');
        }
        $content = @file_get_contents(__DIR__ . '/index.md');
        if ($content === false) {
            send_result($id, array(
                'content' => array(array('type' => 'text', 'text' => 'Contenido no disponible en este momento.')),
                'isError' => true,
            ));
        }
        send_result($id, array(
            'content' => array(array('type' => 'text', 'text' => $content)),
            'isError' => false,
        ));

    default:
        send_error(200, $id, -32601, 'Método no encontrado');
}
