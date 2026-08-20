class AdminSession {
  final String uid;
  final String treeId;
  final String status;

  const AdminSession({
    required this.uid,
    required this.treeId,
    required this.status,
  });

  bool get isActive => status == 'active';

  factory AdminSession.fromMap(String uid, Map<String, dynamic> map) {
    return AdminSession(
      uid: uid,
      treeId: map['treeId'] as String? ?? '',
      status: map['status'] as String? ?? 'disabled',
    );
  }
}
