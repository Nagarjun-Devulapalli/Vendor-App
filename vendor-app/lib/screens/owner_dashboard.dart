import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/activity_provider.dart';
import '../models/employee.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/hero_header.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/task_card.dart';
import 'employee_list_screen.dart';
import 'occurrence_detail_screen.dart';

class OwnerDashboard extends StatefulWidget {
  const OwnerDashboard({super.key});
  @override
  State<OwnerDashboard> createState() => _OwnerDashboardState();
}

class _OwnerDashboardState extends State<OwnerDashboard> {
  int _navIndex = 0;
  List<Employee> _employees = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      context.read<ActivityProvider>().loadTodayTasks();
      _loadEmployees();
    });
  }

  Future<void> _loadEmployees() async {
    try {
      final data = await ApiService.getEmployees();
      if (mounted) {
        setState(() {
          _employees = data
              .map((e) => Employee.fromJson(e as Map<String, dynamic>))
              .toList();
        });
      }
    } catch (_) {}
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty)
      return parts[0][0].toUpperCase();
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final now = DateTime.now();
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(now);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          // Status bar area
          Container(
            color: AppColors.green,
            height: MediaQuery.of(context).padding.top,
          ),
          Expanded(
            child: _navIndex == 0
                ? _buildHome(user, dateStr)
                : _navIndex == 1
                ? _buildTaskList()
                : _navIndex == 2
                ? const EmployeeListScreen(embedded: true)
                : _buildProfile(auth),
          ),
          AppBottomNav(
            currentIndex: _navIndex,
            onTap: (i) => setState(() => _navIndex = i),
            items: const [
              AppNavItem(icon: Icons.home_rounded, label: 'Home'),
              AppNavItem(icon: Icons.assignment_rounded, label: 'Tasks'),
              AppNavItem(icon: Icons.groups_rounded, label: 'Team'),
              AppNavItem(icon: Icons.person_rounded, label: 'Profile'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHome(user, String dateStr) {
    return Consumer<ActivityProvider>(
      builder: (ctx, provider, _) {
        final tasks = provider.todayTasks;
        final doneTasks = tasks.where((t) => t.status == 'completed').length;
        final overdueTasks = tasks.where((t) => t.status == 'missed').length;

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async {
            await provider.loadTodayTasks();
            await _loadEmployees();
          },
          child: CustomScrollView(
            slivers: [
              // Hero
              SliverToBoxAdapter(
                child: HeroHeader(
                  greeting: _getGreeting(),
                  name: user?.firstName ?? 'Vendor',
                  subtitle: '$dateStr · ${user?.branchName ?? ''}',
                  initials: _getInitials(user?.fullName ?? ''),
                ),
              ),
              // Summary
              SliverToBoxAdapter(
                child: TodaySummary(
                  totalTasks: tasks.length,
                  doneTasks: doneTasks,
                  overdueTasks: overdueTasks,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              // Tasks section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("TODAY'S TASKS", style: AppTheme.sectionTitle),
                      GestureDetector(
                        onTap: () => setState(() => _navIndex = 1),
                        child: Text(
                          'See All',
                          style: GoogleFonts.nunito(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              if (provider.isLoading)
                const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator(color: AppColors.green),
                    ),
                  ),
                )
              else if (tasks.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        const Icon(Icons.check_circle_rounded, size: 48, color: AppColors.green),
                        const SizedBox(height: 12),
                        Text(
                          'No tasks for today',
                          style: GoogleFonts.nunito(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => TaskCard(
                        occurrence: tasks[i],
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => OccurrenceDetailScreen(
                                occurrenceId: tasks[i].id,
                              ),
                            ),
                          );
                          if (mounted) provider.loadTodayTasks();
                        },
                      ),
                      childCount: tasks.length > 3 ? 3 : tasks.length,
                    ),
                  ),
                ),
              // Team section
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('MY TEAM', style: AppTheme.sectionTitle),
                      GestureDetector(
                        onTap: () => setState(() => _navIndex = 2),
                        child: Text(
                          'See all →',
                          style: GoogleFonts.nunito(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: _employees.isEmpty
                    ? SliverToBoxAdapter(
                        child: Container(
                          decoration: AppTheme.cardDecoration,
                          padding: const EdgeInsets.all(24),
                          child: Center(
                            child: Text(
                              'No employees yet',
                              style: GoogleFonts.nunito(
                                color: AppColors.muted,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      )
                    : SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (ctx, i) => _employeeCard(_employees[i]),
                          childCount: _employees.length > 3
                              ? 3
                              : _employees.length,
                        ),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _employeeCard(Employee emp) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: AppTheme.cardDecoration,
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.greenLight,
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.center,
            child: Text(
              _getInitials(emp.fullName),
              style: GoogleFonts.nunito(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: AppColors.green,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  emp.fullName,
                  style: GoogleFonts.nunito(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 1),
                Row(
                  children: [
                    const Icon(Icons.phone_rounded, size: 12, color: AppColors.muted),
                    const SizedBox(width: 4),
                    Text(
                      emp.phone,
                      style: GoogleFonts.nunito(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskList() {
    return Consumer<ActivityProvider>(
      builder: (ctx, provider, _) {
        return Column(
          children: [
            // Header
            Container(
              color: AppColors.green,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      "Today's Tasks",
                      style: GoogleFonts.fraunces(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.green,
                onRefresh: () => provider.loadTodayTasks(),
                child: provider.isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.green,
                        ),
                      )
                    : provider.todayTasks.isEmpty
                    ? ListView(
                        children: [
                          const SizedBox(height: 120),
                          const Center(
                            child: Icon(Icons.check_circle_rounded, size: 48, color: AppColors.green),
                          ),
                          const SizedBox(height: 12),
                          Center(
                            child: Text(
                              'All clear!',
                              style: GoogleFonts.nunito(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.muted,
                              ),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: provider.todayTasks.length,
                        itemBuilder: (ctx, i) {
                          final task = provider.todayTasks[i];
                          return TaskCard(
                            occurrence: task,
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => OccurrenceDetailScreen(
                                    occurrenceId: task.id,
                                  ),
                                ),
                              );
                              if (mounted) provider.loadTodayTasks();
                            },
                          );
                        },
                      ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildProfile(AuthProvider auth) {
    final user = auth.user;
    return Column(
      children: [
        Container(
          color: AppColors.green,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Profile',
                  style: GoogleFonts.fraunces(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Avatar
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: AppColors.greenLight,
            borderRadius: BorderRadius.circular(20),
          ),
          alignment: Alignment.center,
          child: Text(
            _getInitials(user?.fullName ?? ''),
            style: GoogleFonts.fraunces(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppColors.green,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          user?.fullName ?? '',
          style: GoogleFonts.nunito(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.text,
          ),
        ),
        Text(
          user?.username ?? '',
          style: GoogleFonts.nunito(
            fontSize: 13,
            color: AppColors.muted,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.greenLight,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Vendor Owner',
            style: GoogleFonts.nunito(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.green,
            ),
          ),
        ),
        const SizedBox(height: 24),
        // Info
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: AppTheme.cardDecoration,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _infoRow('Branch', user?.branchName ?? 'N/A'),
                _divider(),
                _infoRow('Phone', user?.phone ?? 'N/A'),
                _divider(),
                _infoRow('Role', 'Vendor Owner'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => auth.logout(),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.red,
                side: const BorderSide(color: AppColors.red, width: 1.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                'Logout',
                style: GoogleFonts.nunito(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.nunito(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.nunito(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() => const Divider(color: AppColors.border, height: 1);
}
