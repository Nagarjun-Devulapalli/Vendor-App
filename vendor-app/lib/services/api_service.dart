import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:8000/api';

  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final token = await AuthService.getAccessToken();
    return {
      if (isJson) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> _handleResponse(http.Response response) async {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(response.body);
    }
    if (response.statusCode == 401) {
      final refreshed = await _refreshToken();
      if (!refreshed) throw Exception('Session expired. Please login again.');
      throw Exception('TOKEN_REFRESHED');
    }
    throw Exception(response.body.isNotEmpty
        ? jsonDecode(response.body).toString()
        : 'Request failed: ${response.statusCode}');
  }

  static Future<bool> _refreshToken() async {
    final refresh = await AuthService.getRefreshToken();
    if (refresh == null) return false;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/token/refresh/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refresh}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await AuthService.saveTokens(data['access'], refresh);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<dynamic> _get(String path) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(Uri.parse('$baseUrl$path'), headers: headers);
      return await _handleResponse(response);
    } catch (e) {
      if (e.toString().contains('TOKEN_REFRESHED')) {
        final headers = await _getHeaders();
        final response = await http.get(Uri.parse('$baseUrl$path'), headers: headers);
        return await _handleResponse(response);
      }
      rethrow;
    }
  }

  static Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
      return await _handleResponse(response);
    } catch (e) {
      if (e.toString().contains('TOKEN_REFRESHED')) {
        final headers = await _getHeaders();
        final response = await http.post(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: jsonEncode(body),
        );
        return await _handleResponse(response);
      }
      rethrow;
    }
  }

  static Future<dynamic> _patch(String path, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await http.patch(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
      return await _handleResponse(response);
    } catch (e) {
      if (e.toString().contains('TOKEN_REFRESHED')) {
        final headers = await _getHeaders();
        final response = await http.patch(
          Uri.parse('$baseUrl$path'),
          headers: headers,
          body: jsonEncode(body),
        );
        return await _handleResponse(response);
      }
      rethrow;
    }
  }

  // Auth
  static Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = response.body.isNotEmpty ? jsonDecode(response.body) : {};
    throw Exception(error['detail'] ?? error['error'] ?? 'Login failed');
  }

  static Future<Map<String, dynamic>> getProfile() async {
    final data = await _get('/auth/profile/');
    return data as Map<String, dynamic>;
  }

  // Occurrences
  static Future<List<dynamic>> getTodayOccurrences() async {
    final data = await _get('/occurrences/today/');
    return data is List ? data : (data['results'] ?? []);
  }

  static Future<Map<String, dynamic>> getOccurrenceDetail(int id) async {
    final data = await _get('/occurrences/$id/');
    return data as Map<String, dynamic>;
  }

  static Future<void> updateOccurrenceStatus(int id, String status) async {
    await _patch('/occurrences/$id/', {'status': status});
  }

  // Work Logs
  static Future<void> submitWorkLog({
    required int occurrenceId,
    required String description,
    File? beforePhoto,
    File? afterPhoto,
  }) async {
    final token = await AuthService.getAccessToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/work-logs/'));
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['occurrence'] = occurrenceId.toString();
    request.fields['description'] = description;

    if (beforePhoto != null) {
      request.files.add(await http.MultipartFile.fromPath('before_photo', beforePhoto.path));
    }
    if (afterPhoto != null) {
      request.files.add(await http.MultipartFile.fromPath('after_photo', afterPhoto.path));
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to submit work log: ${response.body}');
    }
  }

  // Employees
  static Future<List<dynamic>> getEmployees({int? vendorId}) async {
    final path = vendorId != null ? '/employees/?vendor_owner=$vendorId' : '/employees/';
    final data = await _get(path);
    return data is List ? data : (data['results'] ?? []);
  }

  static Future<Map<String, dynamic>> addEmployee({
    required int vendorOwnerId,
    required String firstName,
    required String lastName,
    required String phone,
    String? aadhar,
    File? photo,
  }) async {
    final token = await AuthService.getAccessToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/employees/'));
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['vendor_owner'] = vendorOwnerId.toString();
    request.fields['first_name'] = firstName;
    request.fields['last_name'] = lastName;
    request.fields['phone'] = phone;
    if (aadhar != null && aadhar.isNotEmpty) request.fields['aadhar_number'] = aadhar;
    if (photo != null) {
      request.files.add(await http.MultipartFile.fromPath('photo', photo.path));
    }
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception(response.body.isNotEmpty ? jsonDecode(response.body).toString() : 'Failed to add employee');
  }

  // Activities
  static Future<List<dynamic>> getActivities() async {
    final data = await _get('/activities/');
    return data is List ? data : (data['results'] ?? []);
  }

  // Work logs for an occurrence
  static Future<List<dynamic>> getWorkLogs(int occurrenceId) async {
    final data = await _get('/work-logs/?occurrence=$occurrenceId');
    return data is List ? data : (data['results'] ?? []);
  }
}
