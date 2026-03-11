import io
import os
import random
import string
from datetime import date, timedelta
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from vendors.models import Branch, Vendor, Employee
from categories.models import WorkCategory
from activities.models import Activity, ActivityOccurrence, WorkLog
from payments.models import Payment

User = get_user_model()


def rand_pass(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def generate_avatar(initials, bg_color):
    """Generate a simple avatar PNG with initials on a colored circle."""
    from PIL import Image, ImageDraw, ImageFont
    size = 200
    img = Image.new('RGB', (size, size), (246, 247, 249))
    draw = ImageDraw.Draw(img)
    # Draw circle
    draw.ellipse([10, 10, size - 10, size - 10], fill=bg_color)
    # Draw initials
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
    except (OSError, IOError):
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), initials, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), initials, fill=(255, 255, 255), font=font)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return ContentFile(buf.getvalue())


AVATAR_COLORS = [
    (26, 107, 74), (45, 143, 99), (37, 99, 168), (192, 57, 43),
    (232, 160, 32), (142, 68, 173), (44, 62, 80), (22, 160, 133),
    (211, 84, 0), (41, 128, 185), (39, 174, 96), (192, 57, 43),
]


class Command(BaseCommand):
    help = 'Seed database with dummy data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...\n')
        credentials = []

        # ── Branches ──────────────────────────────────────────────
        branches_data = [
            ('Orchids HSR Layout', 'HSR Layout, Sector 7', 'Bangalore'),
            ('Orchids Whitefield', 'ITPL Road, Whitefield', 'Bangalore'),
            ('Orchids Sarjapur', 'Sarjapur Road, Attibele', 'Bangalore'),
        ]
        branches = []
        for name, addr, city in branches_data:
            b, _ = Branch.objects.get_or_create(name=name, defaults={'address': addr, 'city': city})
            branches.append(b)
        self.stdout.write(f'  Created {len(branches)} branches')

        # ── Categories (14 refined) ──────────────────────────────
        category_data = [
            ('Facility Maintenance', 'Plumbing, carpentry, painting, general building repairs'),
            ('Cleaning & Housekeeping', 'Classroom cleaning, toilet cleaning, corridor maintenance'),
            ('Grounds & Landscaping', 'Gardening, playground maintenance, lawn care'),
            ('Pest Control', 'Termite treatment, mosquito control, rodent management'),
            ('Safety & Security Systems', 'CCTV maintenance, fire safety equipment checks, access control'),
            ('HVAC & Climate Systems', 'AC servicing, ventilation maintenance, cooling systems'),
            ('IT & Technical Services', 'Network maintenance, smart boards, computer and AV repairs'),
            ('Infrastructure Repair', 'Building repairs, roofing, waterproofing, structural work'),
            ('Power & Utilities', 'Generator maintenance, electrical supply systems, UPS, wiring'),
            ('Waste & Sanitation Services', 'Garbage disposal, water tank cleaning, sewage management'),
            ('Event & Facility Setup', 'Stage setup, sound systems, decorations, furniture rearrangement'),
            ('Transportation Services', 'Bus maintenance, transport vendor services, fleet management'),
            ('Food & Cafeteria Services', 'Canteen operations, kitchen equipment maintenance, hygiene audits'),
            ('Equipment Maintenance', 'Lab equipment, sports equipment repair, gym and playground gear'),
        ]
        cats = {}
        for name, desc in category_data:
            c, _ = WorkCategory.objects.get_or_create(name=name, defaults={'description': desc})
            cats[name] = c
        self.stdout.write(f'  Created {len(cats)} categories')

        # ── Admin users ───────────────────────────────────────────
        admin_data = [
            ('admin_hsr', 'Rajesh', 'Kumar', branches[0]),
            ('admin_whitefield', 'Priya', 'Sharma', branches[1]),
            ('admin_sarjapur', 'Amit', 'Singh', branches[2]),
        ]
        for i, (uname, first, last, branch) in enumerate(admin_data):
            if not User.objects.filter(username=uname).exists():
                user = User.objects.create_user(
                    username=uname, password='admin123',
                    first_name=first, last_name=last,
                    role='admin', branch=branch, is_staff=True,
                    phone=f'90000{random.randint(10000, 99999)}',
                )
                initials = f'{first[0]}{last[0]}'.upper()
                color = AVATAR_COLORS[i % len(AVATAR_COLORS)]
                avatar = generate_avatar(initials, color)
                user.photo.save(f'admin_{first.lower()}_{last.lower()}.png', avatar, save=True)
            else:
                # Add photo to existing admin if missing
                user = User.objects.get(username=uname)
                if not user.photo:
                    initials = f'{first[0]}{last[0]}'.upper()
                    color = AVATAR_COLORS[i % len(AVATAR_COLORS)]
                    avatar = generate_avatar(initials, color)
                    user.photo.save(f'admin_{first.lower()}_{last.lower()}.png', avatar, save=True)
            credentials.append((uname, 'admin123', 'admin', branch.name))
        self.stdout.write(f'  Created 3 admin users')

        # ── Vendors (9 vendors, 3 per branch, diverse category mappings) ──
        vendor_data = [
            # HSR Layout
            ('Kumar Facility Services', 'Ramesh', 'Kumar', branches[0],
             ['Facility Maintenance', 'Infrastructure Repair', 'Power & Utilities']),
            ('SparkClean Solutions', 'Meena', 'Devi', branches[0],
             ['Cleaning & Housekeeping', 'Waste & Sanitation Services', 'Pest Control']),
            ('', 'Suresh', 'Gowda', branches[0],
             ['Grounds & Landscaping', 'Equipment Maintenance']),
            # Whitefield
            ('Patel Technical Works', 'Jayesh', 'Patel', branches[1],
             ['IT & Technical Services', 'Safety & Security Systems', 'Power & Utilities']),
            ('', 'Venkat', 'Reddy', branches[1],
             ['HVAC & Climate Systems', 'Facility Maintenance']),
            ('Reddy Events & Logistics', 'Lakshmi', 'Reddy', branches[1],
             ['Event & Facility Setup', 'Transportation Services']),
            # Sarjapur
            ('Singh Multi-Services', 'Harpreet', 'Singh', branches[2],
             ['Facility Maintenance', 'Infrastructure Repair', 'Cleaning & Housekeeping']),
            ('', 'Rohit', 'Gupta', branches[2],
             ['Food & Cafeteria Services', 'Waste & Sanitation Services', 'Pest Control']),
            ('TechEdge Solutions', 'Ananya', 'Nair', branches[2],
             ['IT & Technical Services', 'Equipment Maintenance', 'Safety & Security Systems']),
        ]
        vendors = []
        for company, first, last, branch, cat_list in vendor_data:
            phone = f'98{random.randint(10000000, 99999999)}'
            username = f'vendor_{phone}'
            password = rand_pass()
            # Check by company_name if it has one, otherwise by user's first+last name
            if company:
                existing = Vendor.objects.filter(company_name=company).first()
            else:
                existing = Vendor.objects.filter(
                    user__first_name=first, user__last_name=last, branch=branch
                ).first()
            if not existing:
                if User.objects.filter(username=username).exists():
                    username = f'vendor_{random.randint(10000000, 99999999)}'
                user = User.objects.create_user(
                    username=username, password=password,
                    first_name=first, last_name=last,
                    role='vendor_owner', branch=branch, phone=phone,
                    aadhar_number=f'{random.randint(100000000000, 999999999999)}',
                )
                initials = f'{first[0]}{last[0]}'.upper()
                color = AVATAR_COLORS[len(vendors) % len(AVATAR_COLORS)]
                avatar = generate_avatar(initials, color)
                user.photo.save(f'vendor_{first.lower()}_{last.lower()}.png', avatar, save=True)
                vendor = Vendor.objects.create(user=user, branch=branch, company_name=company)
                vendor.categories.set([cats[c] for c in cat_list])
                vendors.append(vendor)
                credentials.append((username, password, 'vendor_owner', branch.name))
            else:
                # Add photo to existing vendor if missing
                if not existing.user.photo:
                    initials = f'{first[0]}{last[0]}'.upper()
                    color = AVATAR_COLORS[len(vendors) % len(AVATAR_COLORS)]
                    avatar = generate_avatar(initials, color)
                    existing.user.photo.save(f'vendor_{first.lower()}_{last.lower()}.png', avatar, save=True)
                vendors.append(existing)
                credentials.append((username, '(existing)', 'vendor_owner', branch.name))
        self.stdout.write(f'  Created {len(vendors)} vendors')

        # ── Employees (2 per vendor = 18 employees) ──────────────
        emp_first_names = [
            'Arun', 'Deepak', 'Kiran', 'Manoj', 'Naveen', 'Prakash',
            'Ravi', 'Sanjay', 'Vijay', 'Ganesh', 'Sunil', 'Ashok',
            'Mohan', 'Rahul', 'Dinesh', 'Satish', 'Ramya', 'Kavitha',
        ]
        employees = []
        for i, vendor in enumerate(vendors):
            for j in range(2):
                phone = f'97{random.randint(10000000, 99999999)}'
                username = f'emp_{phone}'
                password = rand_pass()
                idx = i * 2 + j
                if not User.objects.filter(username=username).exists():
                    emp_first = emp_first_names[idx % len(emp_first_names)]
                    emp_last = vendor.user.last_name
                    user = User.objects.create_user(
                        username=username, password=password,
                        first_name=emp_first,
                        last_name=emp_last,
                        role='vendor_employee', branch=vendor.branch, phone=phone,
                        aadhar_number=f'{random.randint(100000000000, 999999999999)}',
                    )
                    initials = f'{emp_first[0]}{emp_last[0]}'.upper()
                    color = AVATAR_COLORS[(i * 2 + j + 3) % len(AVATAR_COLORS)]
                    avatar = generate_avatar(initials, color)
                    user.photo.save(f'emp_{emp_first.lower()}_{emp_last.lower()}.png', avatar, save=True)
                    emp, _ = Employee.objects.get_or_create(user=user, defaults={'vendor_owner': vendor})
                    employees.append(emp)
                    credentials.append((username, password, 'vendor_employee', vendor.branch.name))
        self.stdout.write(f'  Created {len(employees)} employees')

        # ── Activities (20 activities spanning all categories) ────
        today = date.today()
        activity_data = [
            # Facility Maintenance
            ('Bathroom Plumbing Overhaul', vendors[0], cats['Facility Maintenance'],
             'one_time', today - timedelta(days=5), None, None, 15000, 'completed'),
            ('Corridor Repainting - Block A', vendors[0], cats['Facility Maintenance'],
             'long_term', today - timedelta(days=20), today - timedelta(days=5), None, 50000, 'pending'),  # overdue
            # Cleaning & Housekeeping
            ('Daily Classroom Cleaning', vendors[1], cats['Cleaning & Housekeeping'],
             'long_term', today - timedelta(days=30), today + timedelta(days=30), None, 45000, 'in_progress'),
            ('Deep Sanitization Drive', vendors[1], cats['Cleaning & Housekeeping'],
             'one_time', today, None, None, 25000, 'pending'),
            # Grounds & Landscaping
            ('Weekly Garden Maintenance', vendors[2], cats['Grounds & Landscaping'],
             'recurring', today - timedelta(days=60), today + timedelta(days=30), 7, 20000, 'in_progress'),
            ('Playground Turf Relaying', vendors[2], cats['Grounds & Landscaping'],
             'one_time', today + timedelta(days=5), None, None, 35000, 'pending'),
            # IT & Technical
            ('Smart Board Servicing', vendors[3], cats['IT & Technical Services'],
             'recurring', today - timedelta(days=90), today + timedelta(days=90), 30, 30000, 'in_progress'),
            ('Campus WiFi Upgrade', vendors[3], cats['IT & Technical Services'],
             'long_term', today - timedelta(days=10), today + timedelta(days=20), None, 75000, 'in_progress'),
            # Safety & Security
            ('CCTV System Annual Maintenance', vendors[3], cats['Safety & Security Systems'],
             'one_time', today - timedelta(days=3), None, None, 18000, 'completed'),
            ('Fire Extinguisher Inspection', vendors[3], cats['Safety & Security Systems'],
             'recurring', today - timedelta(days=180), today + timedelta(days=180), 90, 12000, 'in_progress'),
            # HVAC
            ('AC Servicing - All Classrooms', vendors[4], cats['HVAC & Climate Systems'],
             'recurring', today - timedelta(days=45), today + timedelta(days=45), 14, 40000, 'in_progress'),
            # Event Setup
            ('Annual Day Stage Setup', vendors[5], cats['Event & Facility Setup'],
             'one_time', today + timedelta(days=15), None, None, 55000, 'pending'),
            # Transportation
            ('School Bus Fleet Servicing', vendors[5], cats['Transportation Services'],
             'recurring', today - timedelta(days=30), today + timedelta(days=60), 30, 60000, 'in_progress'),
            # Infrastructure
            ('Terrace Waterproofing', vendors[6], cats['Infrastructure Repair'],
             'long_term', today - timedelta(days=15), today - timedelta(days=1), None, 80000, 'pending'),  # overdue
            ('Boundary Wall Repair', vendors[6], cats['Infrastructure Repair'],
             'one_time', today - timedelta(days=8), None, None, 22000, 'completed'),
            # Food & Cafeteria
            ('Kitchen Equipment Maintenance', vendors[7], cats['Food & Cafeteria Services'],
             'recurring', today - timedelta(days=60), today + timedelta(days=60), 15, 20000, 'in_progress'),
            ('Cafeteria Hygiene Audit', vendors[7], cats['Food & Cafeteria Services'],
             'one_time', today + timedelta(days=3), None, None, 8000, 'pending'),
            # Pest Control
            ('Quarterly Pest Control', vendors[7], cats['Pest Control'],
             'recurring', today - timedelta(days=90), today + timedelta(days=90), 90, 15000, 'in_progress'),
            # Waste & Sanitation
            ('Water Tank Cleaning', vendors[1], cats['Waste & Sanitation Services'],
             'recurring', today - timedelta(days=60), today + timedelta(days=120), 60, 12000, 'in_progress'),
            # Equipment Maintenance
            ('Lab Equipment Calibration', vendors[8], cats['Equipment Maintenance'],
             'recurring', today - timedelta(days=30), today + timedelta(days=150), 60, 25000, 'in_progress'),
            # Power & Utilities
            ('Generator Servicing', vendors[0], cats['Power & Utilities'],
             'recurring', today - timedelta(days=45), today + timedelta(days=135), 45, 18000, 'in_progress'),
        ]

        activities = []
        for title, vendor, cat, atype, start, end, interval, cost, status in activity_data:
            if not Activity.objects.filter(title=title, vendor=vendor).exists():
                act = Activity.objects.create(
                    branch=vendor.branch, vendor=vendor, category=cat,
                    title=title, activity_type=atype,
                    start_date=start, end_date=end,
                    recurrence_interval_days=interval,
                    expected_cost=cost, status=status,
                )
                activities.append(act)
            else:
                activities.append(Activity.objects.get(title=title, vendor=vendor))
        self.stdout.write(f'  Created {len(activities)} activities')

        # ── Generate occurrences ──────────────────────────────────
        from activities.views import generate_occurrences
        occ_count = 0
        for act in activities:
            if not act.occurrences.exists():
                generate_occurrences(act)
                occ_count += act.occurrences.count()
        self.stdout.write(f'  Generated {occ_count} occurrences')

        # ── Mark past occurrences as completed/missed ─────────────
        past_occs = ActivityOccurrence.objects.filter(
            scheduled_date__lt=today, status='pending'
        ).order_by('?')[:80]
        all_vendor_users = [v.user for v in vendors] + [e.user for e in employees]
        completed_count = 0
        for occ in past_occs:
            occ.status = random.choice(['completed', 'completed', 'completed', 'missed'])
            if occ.status == 'completed' and all_vendor_users:
                occ.completed_by = random.choice(all_vendor_users)
                completed_count += 1
            occ.save()
        self.stdout.write(f'  Marked {len(past_occs)} past occurrences ({completed_count} completed)')

        # ── Work logs ─────────────────────────────────────────────
        completed_occs = list(ActivityOccurrence.objects.filter(status='completed')[:40])
        descriptions = [
            'Completed the repair work as per requirements.',
            'Fixed all issues found during inspection.',
            'Cleaned thoroughly, all areas covered.',
            'Work done satisfactorily. Minor touch-ups pending.',
            'Finished ahead of schedule. Quality work.',
            'Replaced damaged parts with new ones.',
            'Maintenance completed. Everything in working order.',
            'Painting completed. Two coats applied as agreed.',
            'All fixtures installed and tested successfully.',
            'Area cleaned and sanitized as per checklist.',
            'Equipment calibrated and test report submitted.',
            'Servicing done. Next scheduled maintenance noted.',
            'Pest treatment applied. Follow-up in 2 weeks.',
            'Network issue resolved. All access points active.',
            'Tank cleaned and water quality test passed.',
        ]
        wl_count = 0
        for occ in completed_occs:
            if not occ.work_logs.exists():
                user = occ.completed_by or (random.choice(all_vendor_users) if all_vendor_users else None)
                if user:
                    WorkLog.objects.create(
                        occurrence=occ, user=user,
                        description=random.choice(descriptions),
                    )
                    wl_count += 1
        self.stdout.write(f'  Created {wl_count} work logs')

        # ── Payments ──────────────────────────────────────────────
        payment_count = 0
        for act in activities:
            if not act.payments.exists():
                paid_pct = random.choice([0, 0, 0.3, 0.5, 0.75, 1.0])
                if paid_pct == 0:
                    status = 'pending'
                elif paid_pct < 1.0:
                    status = 'partial'
                else:
                    status = 'completed'
                paid_amount = round(float(act.expected_cost) * paid_pct, 2)
                pdate = (today - timedelta(days=random.randint(1, 45))) if paid_pct > 0 else None
                Payment.objects.create(
                    activity=act,
                    expected_amount=act.expected_cost,
                    actual_amount_paid=paid_amount,
                    payment_status=status,
                    payment_date=pdate,
                    notes=f'Payment for {act.title}' if paid_pct > 0 else '',
                )
                payment_count += 1
        self.stdout.write(f'  Created {payment_count} payments')

        # ── Print credentials ─────────────────────────────────────
        self.stdout.write('\n' + '=' * 90)
        self.stdout.write('CREDENTIALS')
        self.stdout.write('=' * 90)
        self.stdout.write(f'{"Username":<30} {"Password":<15} {"Role":<20} {"Branch"}')
        self.stdout.write('-' * 90)
        for uname, pwd, role, branch in credentials:
            self.stdout.write(f'{uname:<30} {pwd:<15} {role:<20} {branch}')
        self.stdout.write('=' * 90)
        self.stdout.write(self.style.SUCCESS(f'\nSeed data created successfully!'))
        self.stdout.write(f'  {len(branches)} branches, {len(cats)} categories, {len(vendors)} vendors')
        self.stdout.write(f'  {len(employees)} employees, {len(activities)} activities, {payment_count} payments')
