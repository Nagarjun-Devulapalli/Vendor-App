import 'package:equatable/equatable.dart';

class Employee extends Equatable {
  final int id;
  final String firstName;
  final String lastName;
  final String username;
  final String phone;
  final String? aadhar;
  final String? photo;
  final bool isActive;
  final int vendorOwnerId;

  const Employee({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.username,
    required this.phone,
    this.aadhar,
    this.photo,
    required this.isActive,
    required this.vendorOwnerId,
  });

  @override
  List<Object?> get props => [
        id,
        firstName,
        lastName,
        username,
        phone,
        aadhar,
        photo,
        isActive,
        vendorOwnerId,
      ];

  factory Employee.fromJson(Map<String, dynamic> json) {
    final user = json['user'] is Map ? json['user'] as Map<String, dynamic> : <String, dynamic>{};
    return Employee(
      id: json['id'] ?? 0,
      firstName: user['first_name'] ?? json['first_name'] ?? '',
      lastName: user['last_name'] ?? json['last_name'] ?? '',
      username: user['username'] ?? '',
      phone: user['phone'] ?? json['phone'] ?? '',
      aadhar: user['aadhar_number'] ?? json['aadhar_number'],
      photo: user['photo'],
      isActive: json['is_active'] ?? true,
      vendorOwnerId: json['vendor_owner'] is Map
          ? json['vendor_owner']['id'] ?? 0
          : (json['vendor_owner'] ?? 0),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'first_name': firstName,
        'last_name': lastName,
        'username': username,
        'phone': phone,
        'aadhar_number': aadhar,
        'photo': photo,
        'is_active': isActive,
        'vendor_owner': vendorOwnerId,
      };

  Employee copyWith({
    int? id,
    String? firstName,
    String? lastName,
    String? username,
    String? phone,
    String? aadhar,
    String? photo,
    bool? isActive,
    int? vendorOwnerId,
  }) =>
      Employee(
        id: id ?? this.id,
        firstName: firstName ?? this.firstName,
        lastName: lastName ?? this.lastName,
        username: username ?? this.username,
        phone: phone ?? this.phone,
        aadhar: aadhar ?? this.aadhar,
        photo: photo ?? this.photo,
        isActive: isActive ?? this.isActive,
        vendorOwnerId: vendorOwnerId ?? this.vendorOwnerId,
      );

  String get fullName => '$firstName $lastName'.trim();
}
