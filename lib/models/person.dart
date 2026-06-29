enum Gender { male, female, other, unknown }

Gender genderFromString(String s) {
  switch (s.toLowerCase()) {
    case 'male':
      return Gender.male;
    case 'female':
      return Gender.female;
    case 'other':
      return Gender.other;
    default:
      return Gender.unknown;
  }
}

String genderToString(Gender g) {
  switch (g) {
    case Gender.male:
      return 'male';
    case Gender.female:
      return 'female';
    case Gender.other:
      return 'other';
    case Gender.unknown:
      return 'unknown';
  }
}

class Person {
  final String id;
  String name;
  Gender gender;
  DateTime? dateOfBirth;
  DateTime? dateOfDeath;
  bool isAlive;
  String? contactNumber;
  String? currentPlaceOfResidence;

  Person({
    required this.id,
    required this.name,
    this.gender = Gender.unknown,
    this.dateOfBirth,
    this.dateOfDeath,
    this.isAlive = true,
    this.contactNumber,
    this.currentPlaceOfResidence,
  });

  factory Person.fromJson(Map<String, dynamic> json) {
    return Person(
      id: json['id'] as String,
      name: json['name'] as String,
      gender: genderFromString(json['gender'] as String? ?? 'unknown'),
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'] as String)
          : null,
      dateOfDeath: json['dateOfDeath'] != null
          ? DateTime.tryParse(json['dateOfDeath'] as String)
          : null,
      isAlive: json['isAlive'] as bool? ?? true,
      contactNumber: json['contactNumber'] as String?,
      currentPlaceOfResidence: json['currentPlaceOfResidence'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'gender': genderToString(gender),
      'dateOfBirth': dateOfBirth?.toIso8601String().split('T').first,
      'dateOfDeath': dateOfDeath?.toIso8601String().split('T').first,
      'isAlive': isAlive,
      'contactNumber': contactNumber,
      'currentPlaceOfResidence': currentPlaceOfResidence,
    };
  }

  Person copyWith({
    String? id,
    String? name,
    Gender? gender,
    DateTime? dateOfBirth,
    DateTime? dateOfDeath,
    bool? isAlive,
    String? contactNumber,
    String? currentPlaceOfResidence,
    bool clearDateOfDeath = false,
    bool clearDateOfBirth = false,
    bool clearContact = false,
    bool clearResidence = false,
  }) {
    return Person(
      id: id ?? this.id,
      name: name ?? this.name,
      gender: gender ?? this.gender,
      dateOfBirth: clearDateOfBirth ? null : (dateOfBirth ?? this.dateOfBirth),
      dateOfDeath: clearDateOfDeath ? null : (dateOfDeath ?? this.dateOfDeath),
      isAlive: isAlive ?? this.isAlive,
      contactNumber: clearContact ? null : (contactNumber ?? this.contactNumber),
      currentPlaceOfResidence: clearResidence
          ? null
          : (currentPlaceOfResidence ?? this.currentPlaceOfResidence),
    );
  }

  @override
  String toString() => name;
}
