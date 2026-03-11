class Employee {
  final int id;
  final String firstName;
  final String lastName;
  final String phone;
  final String? aadhar;
  final int vendorOwnerId;

  Employee({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.aadhar,
    required this.vendorOwnerId,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    final user = json['user'] is Map ? json['user'] as Map<String, dynamic> : <String, dynamic>{};
    return Employee(
      id: json['id'] ?? 0,
      firstName: user['first_name'] ?? json['first_name'] ?? '',
      lastName: user['last_name'] ?? json['last_name'] ?? '',
      phone: user['phone'] ?? json['phone'] ?? '',
      aadhar: user['aadhar_number'] ?? json['aadhar_number'],
      vendorOwnerId: json['vendor_owner'] is Map
          ? json['vendor_owner']['id'] ?? 0
          : (json['vendor_owner'] ?? 0),
    );
  }

  String get fullName => '$firstName $lastName'.trim();
}
