import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:vendor_app/core/routes.dart';
import '../../auth/cubit/auth_cubit.dart';
import '../cubit/activity_cubit.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/hero_header.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/task_card.dart';

class EmployeeDashboard extends StatefulWidget {
  const EmployeeDashboard({super.key});
  @override
  State<EmployeeDashboard> createState() => _EmployeeDashboardState();
}

class _EmployeeDashboardState extends State<EmployeeDashboard> {
  int _navIndex = 0;
  int _taskTabIndex = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<ActivityCubit>().loadTodayTasks());
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
    if (parts.isNotEmpty && parts[0].isNotEmpty)
      return parts[0][0].toUpperCase();
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthCubit>().state;
    final user = authState.user;
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
                : _buildProfile(),
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
    return BlocBuilder<ActivityCubit, ActivityState>(
      builder: (ctx, activityState) {
        final tasks = activityState.todayTasks;
        final doneTasks = tasks.where((t) => t.isCompleted).length;
        final pendingTasks = tasks.where((t) => t.isPending).length;

        return NotificationListener<OverscrollIndicatorNotification>(
          onNotification: (n) {
            n.disallowIndicator();
            return true;
          },
          child: RefreshIndicator(
            color: AppColors.green,
            onRefresh: () => context.read<ActivityCubit>().loadTodayTasks(),
            child: CustomScrollView(
              physics: const ClampingScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: HeroHeader(
                    greeting: 'Hi',
                    name: user?.firstName ?? 'Employee',
                    subtitle: '$dateStr \u00b7 ${user?.branchName ?? ''}',
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
                if (activityState.isLoading)
                  const SliverToBoxAdapter(
                    child: Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(
                          color: AppColors.green,
                        ),
                      ),
                    ),
                  )
                else if (tasks.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          const Icon(
                            Icons.check_circle_rounded,
                            size: 48,
                            color: AppColors.green,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No tasks for today',
                            style: TextStyle(
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
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => TaskCard(
                          occurrence: tasks[i],
                          onTap: () async {
                            await context.pushNamed(
                              VendorRoute.vendorOccurrenceDetail.name,
                              pathParameters: {'occurrenceId': tasks[i].id.toString()},
                            );
                            if (mounted) context.read<ActivityCubit>().loadTodayTasks();
                          },
                        ),
                        childCount: tasks.length,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTaskList() {
    return BlocBuilder<ActivityCubit, ActivityState>(
      builder: (ctx, activityState) {
        final filteredTasks = _taskTabIndex == 0
            ? activityState.todayTasks.where((t) => !t.isCompleted).toList()
            : activityState.todayTasks.where((t) => t.isCompleted).toList();
        return Column(
          children: [
            Container(
              color: AppColors.green,
              padding: const EdgeInsets.fromLTRB(8, 12, 20, 20),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                    onPressed: () => setState(() => _navIndex = 0),
                  ),
                  Expanded(
                    child: Text(
                      'My Tasks',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Tab bar
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    _buildTaskTab('Pending', 0),
                    _buildTaskTab('Completed', 1),
                  ],
                ),
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.green,
                onRefresh: () => context.read<ActivityCubit>().loadTodayTasks(),
                child: activityState.isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.green,
                        ),
                      )
                    : filteredTasks.isEmpty
                    ? ListView(
                        children: [
                          const SizedBox(height: 120),
                          Center(
                            child: Icon(
                              _taskTabIndex == 0
                                  ? Icons.task_alt_rounded
                                  : Icons.check_circle_rounded,
                              size: 48,
                              color: AppColors.green,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Center(
                            child: Text(
                              _taskTabIndex == 0
                                  ? 'No pending tasks'
                                  : 'No completed tasks',
                              style: TextStyle(
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
                        itemCount: filteredTasks.length,
                        itemBuilder: (ctx, i) {
                          final task = filteredTasks[i];
                          return TaskCard(
                            occurrence: task,
                            onTap: () async {
                              await context.pushNamed(
                                VendorRoute.vendorOccurrenceDetail.name,
                                pathParameters: {'occurrenceId': task.id.toString()},
                              );
                              if (mounted) context.read<ActivityCubit>().loadTodayTasks();
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

  Widget _buildTaskTab(String label, int index) {
    final isActive = _taskTabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _taskTabIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? AppColors.green : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isActive ? Colors.white : AppColors.muted,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfile() {
    final user = context.watch<AuthCubit>().state.user;
    return Column(
      children: [
        Container(
          color: AppColors.green,
          padding: const EdgeInsets.fromLTRB(8, 12, 20, 20),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                onPressed: () => setState(() => _navIndex = 0),
              ),
              Expanded(
                child: Text(
                  'Profile',
                  style: TextStyle(
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
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppColors.green,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          user?.fullName ?? '',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.text,
          ),
        ),
        Text(
          user?.username ?? '',
          style: TextStyle(
            fontSize: 13,
            color: AppColors.muted,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.blueLight,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Employee',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.blue,
            ),
          ),
        ),
        const SizedBox(height: 24),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: AppTheme.cardDecoration,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _infoRow(
                  'Company',
                  user?.companyName ?? 'N/A',
                ),
                const Divider(color: AppColors.border, height: 1),
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
              onPressed: () => context.read<AuthCubit>().logout(),
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
                style: TextStyle(
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
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
        ],
      ),
    );
  }
}
