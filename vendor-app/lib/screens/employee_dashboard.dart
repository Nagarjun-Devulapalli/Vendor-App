import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/activity_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/hero_header.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/task_card.dart';
import 'occurrence_detail_screen.dart';

class EmployeeDashboard extends StatefulWidget {
  const EmployeeDashboard({super.key});
  @override
  State<EmployeeDashboard> createState() => _EmployeeDashboardState();
}

class _EmployeeDashboardState extends State<EmployeeDashboard> {
  int _navIndex = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<ActivityProvider>().loadTodayTasks());
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Hi';
    if (hour < 17) return 'Hi';
    return 'Hi';
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final dateStr = DateFormat('EEEE, d MMM').format(DateTime.now());

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          Container(
            color: AppColors.green,
            height: MediaQuery.of(context).padding.top,
          ),
          Expanded(
            child: _navIndex == 0
                ? _buildHome(user, dateStr)
                : _navIndex == 1
                    ? _buildTaskList()
                    : _buildProfile(auth),
          ),
          AppBottomNav(
            currentIndex: _navIndex,
            onTap: (i) => setState(() => _navIndex = i),
            items: const [
              AppNavItem(icon: Icons.home_rounded, label: 'Home'),
              AppNavItem(icon: Icons.assignment_rounded, label: 'Tasks'),
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
        final pendingTasks = tasks.where((t) => t.status == 'pending').length;

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () => provider.loadTodayTasks(),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: HeroHeader(
                  greeting: '${_getGreeting()},',
                  name: user?.firstName ?? 'Employee',
                  subtitle: '$dateStr · ${user?.branchName ?? ''}',
                  initials: _getInitials(user?.fullName ?? ''),
                  onAvatarTap: () => setState(() => _navIndex = 2),
                ),
              ),
              SliverToBoxAdapter(
                child: TodaySummary(
                  totalTasks: tasks.length,
                  doneTasks: doneTasks,
                  overdueTasks: pendingTasks,
                  thirdLabel: 'Pending',
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text('MY TASKS TODAY', style: AppTheme.sectionTitle),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              if (provider.isLoading)
                const SliverToBoxAdapter(
                  child: Center(child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(color: AppColors.green),
                  )),
                )
              else if (tasks.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        const Icon(Icons.check_circle_rounded, size: 48, color: AppColors.green),
                        const SizedBox(height: 12),
                        Text('No tasks for today', style: GoogleFonts.nunito(
                          fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.muted,
                        )),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => TaskCard(
                        occurrence: tasks[i],
                        onTap: () async {
                          await Navigator.push(context, MaterialPageRoute(
                            builder: (_) => OccurrenceDetailScreen(occurrenceId: tasks[i].id),
                          ));
                          if (mounted) provider.loadTodayTasks();
                        },
                      ),
                      childCount: tasks.length,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTaskList() {
    return Consumer<ActivityProvider>(
      builder: (ctx, provider, _) {
        return Column(
          children: [
            Container(
              color: AppColors.green,
              padding: const EdgeInsets.fromLTRB(8, 12, 20, 20),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                    onPressed: () => setState(() => _navIndex = 0),
                  ),
                  Expanded(
                    child: Text('My Tasks', style: GoogleFonts.fraunces(
                      fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
                    )),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.green,
                onRefresh: () => provider.loadTodayTasks(),
                child: provider.isLoading
                    ? const Center(child: CircularProgressIndicator(color: AppColors.green))
                    : provider.todayTasks.isEmpty
                        ? ListView(children: [
                            const SizedBox(height: 120),
                            const Center(child: Icon(Icons.check_circle_rounded, size: 48, color: AppColors.green)),
                            const SizedBox(height: 12),
                            Center(child: Text('All clear!', style: GoogleFonts.nunito(
                              fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.muted,
                            ))),
                          ])
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: provider.todayTasks.length,
                            itemBuilder: (ctx, i) {
                              final task = provider.todayTasks[i];
                              return TaskCard(
                                occurrence: task,
                                onTap: () async {
                                  await Navigator.push(context, MaterialPageRoute(
                                    builder: (_) => OccurrenceDetailScreen(occurrenceId: task.id),
                                  ));
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
          padding: const EdgeInsets.fromLTRB(8, 12, 20, 20),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                onPressed: () => setState(() => _navIndex = 0),
              ),
              Expanded(
                child: Text('Profile', style: GoogleFonts.fraunces(
                  fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
                )),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Container(
          width: 72, height: 72,
          decoration: BoxDecoration(
            color: AppColors.greenLight,
            borderRadius: BorderRadius.circular(20),
          ),
          alignment: Alignment.center,
          child: Text(
            _getInitials(user?.fullName ?? ''),
            style: GoogleFonts.fraunces(
              fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.green,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(user?.fullName ?? '', style: GoogleFonts.nunito(
          fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text,
        )),
        Text(user?.username ?? '', style: GoogleFonts.nunito(
          fontSize: 13, color: AppColors.muted, fontWeight: FontWeight.w600,
        )),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.blueLight,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text('Employee', style: GoogleFonts.nunito(
            fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.blue,
          )),
        ),
        const SizedBox(height: 24),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: AppTheme.cardDecoration,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _infoRow('Branch', user?.branchName ?? 'N/A'),
                const Divider(color: AppColors.border, height: 1),
                _infoRow('Phone', user?.phone ?? 'N/A'),
                const Divider(color: AppColors.border, height: 1),
                _infoRow('Role', 'Employee'),
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
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: Text('Logout', style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15)),
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
          Text(label, style: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted)),
          Text(value, style: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text)),
        ],
      ),
    );
  }
}
