class User {
  final int id;
  final String username;
  final String firstName;
  final String lastName;
  final String role;
  final String phone;
  final int? branchId;
  final String? branchName;
  final String? companyName;

  User({
    required this.id,
    required this.username,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.phone,
    this.branchId,
    this.branchName,
    this.companyName,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] ?? 0,
        username: json['username'] ?? '',
        firstName: json['first_name'] ?? '',
        lastName: json['last_name'] ?? '',
        role: json['role'] ?? '',
        phone: json['phone'] ?? '',
        branchId: json['branch'],
        branchName: json['branch_name'],
        companyName: json['company_name'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'first_name': firstName,
        'last_name': lastName,
        'role': role,
        'phone': phone,
        'branch': branchId,
        'company_name': companyName,
      };

  String get fullName => '$firstName $lastName'.trim();
  bool get isOwner => role == 'vendor_owner';
  bool get isEmployee => role == 'vendor_employee';
}
