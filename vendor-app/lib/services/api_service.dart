import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:8000/api';
  static const String mediaBaseUrl = 'http://10.0.2.2:8000';

  /// Resolves a photo URL from the API to a full URL.
  /// Handles both relative paths (/media/...) and full URLs.
  static String resolvePhotoUrl(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replaceFirst('http://localhost:8000', mediaBaseUrl)
                .replaceFirst('http://127.0.0.1:8000', mediaBaseUrl);
    }
    return '$mediaBaseUrl$url';
  }

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

  static Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
      return await _handleResponse(response);
    } catch (e) {
      if (e.toString().contains('TOKEN_REFRESHED')) {
        final headers = await _getHeaders();
        final response = await http.put(
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

  static Future<void> resetPassword(String username, String newPassword) async {
    await _put('/auth/reset-password/', {
      'username': username,
      'new_password': newPassword,
    });
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

  // Mark activity as completed (stops new occurrences)
  static Future<Map<String, dynamic>> markActivityComplete(int activityId) async {
    final data = await _patch('/activities/$activityId/mark-complete/', {});
    return data as Map<String, dynamic>;
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

  static Future<void> completeWorkLog({
    required int workLogId,
    required File afterPhoto,
  }) async {
    final token = await AuthService.getAccessToken();
    final request = http.MultipartRequest(
      'PATCH',
      Uri.parse('$baseUrl/work-logs/$workLogId/complete/'),
    );
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(
      await http.MultipartFile.fromPath('after_photo', afterPhoto.path),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to complete work log: ${response.body}');
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

  static Future<void> updateEmployee({
    required int employeeId,
    String? firstName,
    String? lastName,
    String? phone,
    String? aadhar,
    File? photo,
  }) async {
    final token = await AuthService.getAccessToken();
    final request = http.MultipartRequest('PATCH', Uri.parse('$baseUrl/employees/$employeeId/'));
    request.headers['Authorization'] = 'Bearer $token';
    if (firstName != null) request.fields['first_name'] = firstName;
    if (lastName != null) request.fields['last_name'] = lastName;
    if (phone != null) request.fields['phone'] = phone;
    if (aadhar != null) request.fields['aadhar_number'] = aadhar;
    if (photo != null) {
      request.files.add(await http.MultipartFile.fromPath('photo', photo.path));
    }
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(response.body.isNotEmpty ? jsonDecode(response.body).toString() : 'Failed to update employee');
    }
  }

  static Future<void> deleteEmployee(int employeeId) async {
    final token = await AuthService.getAccessToken();
    final response = await http.delete(
      Uri.parse('$baseUrl/employees/$employeeId/'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to delete employee');
    }
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

  // Assignments
  static Future<void> assignEmployee(int occurrenceId, int employeeId) async {
    await _post('/occurrences/$occurrenceId/assign/', {'employee_id': employeeId});
  }

  static Future<void> unassignEmployee(int occurrenceId, int employeeId) async {
    await _post('/occurrences/$occurrenceId/unassign/', {'employee_id': employeeId});
  }
}
