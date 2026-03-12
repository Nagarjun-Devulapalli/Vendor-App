import 'dart:io';
import 'package:dio/dio.dart';
import 'auth_service.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:8000/api';
  static const String mediaBaseUrl = 'http://10.0.2.2:8000';

  static final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  /// Resolves a photo URL from the API to a full URL.
  static String resolvePhotoUrl(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
          .replaceFirst('http://localhost:8000', mediaBaseUrl)
          .replaceFirst('http://127.0.0.1:8000', mediaBaseUrl);
    }
    return '$mediaBaseUrl$url';
  }

  static Future<Options> _getOptions({bool isJson = true}) async {
    final token = await AuthService.getAccessToken();
    return Options(
      headers: {
        if (isJson) 'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      },
    );
  }

  static Future<dynamic> _handleResponse(Response response) async {
    if (response.statusCode! >= 200 && response.statusCode! < 300) {
      return response.data ?? {};
    }
    throw Exception('Request failed: ${response.statusCode}');
  }

  static Future<bool> _refreshToken() async {
    final refresh = await AuthService.getRefreshToken();
    if (refresh == null) return false;
    try {
      final response = await _dio.post(
        '/auth/token/refresh/',
        data: {'refresh': refresh},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );
      if (response.statusCode == 200) {
        await AuthService.saveTokens(response.data['access'], refresh);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<dynamic> _get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    try {
      final options = await _getOptions();
      final response = await _dio.get(path,
          options: options, queryParameters: queryParameters);
      return await _handleResponse(response);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final refreshed = await _refreshToken();
        if (!refreshed) throw Exception('Session expired. Please login again.');
        final options = await _getOptions();
        final response = await _dio.get(path,
            options: options, queryParameters: queryParameters);
        return await _handleResponse(response);
      }
      _handleDioError(e);
    }
  }

  static Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    try {
      final options = await _getOptions();
      final response = await _dio.post(path, data: body, options: options);
      return await _handleResponse(response);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final refreshed = await _refreshToken();
        if (!refreshed) throw Exception('Session expired. Please login again.');
        final options = await _getOptions();
        final response = await _dio.post(path, data: body, options: options);
        return await _handleResponse(response);
      }
      _handleDioError(e);
    }
  }

  static Future<dynamic> _patch(String path, Map<String, dynamic> body) async {
    try {
      final options = await _getOptions();
      final response = await _dio.patch(path, data: body, options: options);
      return await _handleResponse(response);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final refreshed = await _refreshToken();
        if (!refreshed) throw Exception('Session expired. Please login again.');
        final options = await _getOptions();
        final response = await _dio.patch(path, data: body, options: options);
        return await _handleResponse(response);
      }
      _handleDioError(e);
    }
  }

  static Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    try {
      final options = await _getOptions();
      final response = await _dio.put(path, data: body, options: options);
      return await _handleResponse(response);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final refreshed = await _refreshToken();
        if (!refreshed) throw Exception('Session expired. Please login again.');
        final options = await _getOptions();
        final response = await _dio.put(path, data: body, options: options);
        return await _handleResponse(response);
      }
      _handleDioError(e);
    }
  }

  static Never _handleDioError(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      throw Exception(
          data['detail'] ?? data['error'] ?? data.toString());
    }
    throw Exception(data?.toString() ?? 'Request failed: ${e.message}');
  }

  // Auth
  static Future<Map<String, dynamic>> login(
      String username, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login/',
        data: {'username': username, 'password': password},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      throw Exception('Login failed');
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map) {
        throw Exception(data['detail'] ?? data['error'] ?? 'Login failed');
      }
      throw Exception('Login failed');
    }
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

  // Mark activity as completed (stops new occurrences)
  static Future<Map<String, dynamic>> markActivityComplete(
      int activityId) async {
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
    final formData = FormData.fromMap({
      'occurrence': occurrenceId.toString(),
      'description': description,
      if (beforePhoto != null)
        'before_photo': await MultipartFile.fromFile(beforePhoto.path),
      if (afterPhoto != null)
        'after_photo': await MultipartFile.fromFile(afterPhoto.path),
    });

    final response = await _dio.post(
      '/work-logs/',
      data: formData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    if (response.statusCode! < 200 || response.statusCode! >= 300) {
      throw Exception('Failed to submit work log: ${response.data}');
    }
  }

  static Future<void> completeWorkLog({
    required int workLogId,
    required File afterPhoto,
  }) async {
    final token = await AuthService.getAccessToken();
    final formData = FormData.fromMap({
      'after_photo': await MultipartFile.fromFile(afterPhoto.path),
    });

    final response = await _dio.patch(
      '/work-logs/$workLogId/complete/',
      data: formData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    if (response.statusCode! < 200 || response.statusCode! >= 300) {
      throw Exception('Failed to complete work log: ${response.data}');
    }
  }

  // Employees
  static Future<List<dynamic>> getEmployees({int? vendorId}) async {
    final path =
        vendorId != null ? '/employees/?vendor_owner=$vendorId' : '/employees/';
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
    final formData = FormData.fromMap({
      'vendor_owner': vendorOwnerId.toString(),
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
      if (aadhar != null && aadhar.isNotEmpty) 'aadhar_number': aadhar,
      if (photo != null) 'photo': await MultipartFile.fromFile(photo.path),
    });

    final response = await _dio.post(
      '/employees/',
      data: formData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    if (response.statusCode! >= 200 && response.statusCode! < 300) {
      return response.data as Map<String, dynamic>;
    }
    throw Exception(response.data?.toString() ?? 'Failed to add employee');
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
    final map = <String, dynamic>{};
    if (firstName != null) map['first_name'] = firstName;
    if (lastName != null) map['last_name'] = lastName;
    if (phone != null) map['phone'] = phone;
    if (aadhar != null) map['aadhar_number'] = aadhar;
    if (photo != null) {
      map['photo'] = await MultipartFile.fromFile(photo.path);
    }
    final formData = FormData.fromMap(map);

    final response = await _dio.patch(
      '/employees/$employeeId/',
      data: formData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    if (response.statusCode! < 200 || response.statusCode! >= 300) {
      throw Exception(
          response.data?.toString() ?? 'Failed to update employee');
    }
  }

  static Future<void> deleteEmployee(int employeeId) async {
    final token = await AuthService.getAccessToken();
    final response = await _dio.delete(
      '/employees/$employeeId/',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    if (response.statusCode! < 200 || response.statusCode! >= 300) {
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
  static Future<void> assignEmployee(
      int occurrenceId, int employeeId) async {
    await _post(
        '/occurrences/$occurrenceId/assign/', {'employee_id': employeeId});
  }

  static Future<void> unassignEmployee(
      int occurrenceId, int employeeId) async {
    await _post(
        '/occurrences/$occurrenceId/unassign/', {'employee_id': employeeId});
  }
}
