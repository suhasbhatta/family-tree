class FamilyUnit {
  final String id;
  String? husbandId;
  String? wifeId;
  DateTime? anniversaryDate;
  List<String> childrenIds;

  FamilyUnit({
    required this.id,
    this.husbandId,
    this.wifeId,
    this.anniversaryDate,
    List<String>? childrenIds,
  }) : childrenIds = childrenIds ?? [];

  factory FamilyUnit.fromJson(Map<String, dynamic> json) {
    return FamilyUnit(
      id: json['id'] as String,
      husbandId: json['husbandId'] as String?,
      wifeId: json['wifeId'] as String?,
      anniversaryDate: json['anniversaryDate'] != null
          ? DateTime.tryParse(json['anniversaryDate'] as String)
          : null,
      childrenIds: (json['childrenIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'husbandId': husbandId,
      'wifeId': wifeId,
      'anniversaryDate':
          anniversaryDate?.toIso8601String().split('T').first,
      'childrenIds': childrenIds,
    };
  }

  FamilyUnit copyWith({
    String? id,
    String? husbandId,
    String? wifeId,
    DateTime? anniversaryDate,
    List<String>? childrenIds,
    bool clearHusband = false,
    bool clearWife = false,
    bool clearAnniversary = false,
  }) {
    return FamilyUnit(
      id: id ?? this.id,
      husbandId: clearHusband ? null : (husbandId ?? this.husbandId),
      wifeId: clearWife ? null : (wifeId ?? this.wifeId),
      anniversaryDate:
          clearAnniversary ? null : (anniversaryDate ?? this.anniversaryDate),
      childrenIds: childrenIds ?? List.from(this.childrenIds),
    );
  }

  List<String> get allMemberIds {
    final ids = <String>[];
    if (husbandId != null) ids.add(husbandId!);
    if (wifeId != null) ids.add(wifeId!);
    ids.addAll(childrenIds);
    return ids;
  }
}
