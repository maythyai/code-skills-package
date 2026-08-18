---
name: csp-django-patterns
description: Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps.
layer: 3
category: patterns
domain: patterns
phase: build
tools: [Read, Write, Edit, Glob, Grep, Bash]
related_skills: [csp-django-security, csp-python-patterns, csp-python-testing, csp-postgres-patterns, csp-code-review]
anti_rationalizations:
  "Django has built-in admin, no need for API": "Admin is for internal use. APIs are for programmatic access and frontend separation."
  "I'll add select_related later": "N+1 queries in production can bring down the database. Optimize queries from the start."
  "Just put it in the view": "Fat views are the #1 source of untestable Django code. Use service layers."
---

# Django Patterns

Production-grade Django architecture patterns covering models, views, services, serializers, and middleware.

## Project Structure

```
project/
├── config/               # Settings (split by environment)
│   ├── settings/
│   │   ├── base.py       # Shared settings
│   │   ├── dev.py        # Development overrides
│   │   ├── staging.py    # Staging overrides
│   │   └── prod.py       # Production overrides
│   ├── urls.py
│   └── wsgi.py
├── apps/                 # Django apps (business domains)
│   ├── users/
│   │   ├── models.py
│   │   ├── services.py   # Business logic layer
│   │   ├── selectors.py  # Read-only query layer
│   │   ├── api/          # DRF serializers + views
│   │   ├── admin.py
│   │   └── tests/
│   └── orders/
├── common/               # Shared utilities
│   ├── models.py         # Base model with timestamps
│   └── pagination.py
└── manage.py
```

## Model Patterns

### Base Model with Timestamps

```python
from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']
```

### Custom QuerySet & Manager

```python
class OrderQuerySet(models.QuerySet):
    def paid(self):
        return self.filter(status='paid')

    def recent(self, days=30):
        cutoff = timezone.now() - timedelta(days=days)
        return self.filter(created_at__gte=cutoff)

    def with_items(self):
        return self.prefetch_related('items')


class OrderManager(models.Manager):
    def get_queryset(self):
        return OrderQuerySet(self.model, using=self._db)

    def paid(self):
        return self.get_queryset().paid()

    def recent(self, days=30):
        return self.get_queryset().recent(days)


class Order(TimestampedModel):
    status = models.CharField(max_length=20, default='pending')
    # ...

    objects = OrderManager()
```

### Query Optimization

```python
# BAD: N+1 queries — one for orders, one per order for items
orders = Order.objects.all()
for order in orders:
    print(order.items.count())  # Hits DB each iteration

# GOOD: prefetch_related for reverse FK / M2M
orders = Order.objects.prefetch_related('items').all()

# GOOD: select_related for FK / OneToOne
orders = Order.objects.select_related('customer').all()

# GOOD: combined
orders = (
    Order.objects
    .select_related('customer')
    .prefetch_related('items', 'items__product')
    .only('id', 'status', 'customer__name')
    .all()
)
```

### Bulk Operations

```python
# BAD: N inserts
for item in items_data:
    OrderItem.objects.create(order=order, **item)

# GOOD: single insert
OrderItem.objects.bulk_create([
    OrderItem(order=order, **item) for item in items_data
])

# Bulk update with conflict handling
OrderItem.objects.bulk_create(
    items,
    update_conflicts=True,
    unique_fields=['order', 'product'],
    update_fields=['quantity', 'updated_at'],
)
```

## Service Layer Pattern

```python
# apps/orders/services.py
from django.db import transaction
from django.core.exceptions import ValidationError


class OrderService:
    """Business logic for order operations. Views delegate here."""

    @staticmethod
    @transaction.atomic
    def place_order(user, items_data):
        if not items_data:
            raise ValidationError("Order must contain at least one item")

        order = Order.objects.create(user=user, status='pending')
        items = [
            OrderItem(order=order, **item) for item in items_data
        ]
        OrderItem.objects.bulk_create(items)

        order.update_total()
        OrderPlacedSignal.send(sender=Order, order=order)
        return order

    @staticmethod
    @transaction.atomic
    def cancel_order(order, cancelled_by):
        if order.status not in ('pending', 'confirmed'):
            raise ValidationError(f"Cannot cancel order in {order.status} status")
        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])
        # Restore inventory, send notifications, etc.
```

## Selector Pattern (Read-only Queries)

```python
# apps/orders/selectors.py
class OrderSelector:
    """Read-only query methods. No side effects, no mutations."""

    @staticmethod
    def get_user_orders(user, status=None):
        qs = Order.objects.filter(user=user).select_related('customer')
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')

    @staticmethod
    def get_order_with_items(order_id):
        return (
            Order.objects
            .select_related('customer')
            .prefetch_related('items__product')
            .get(id=order_id)
        )
```

## DRF Patterns

### Serializer with Validation

```python
from rest_framework import serializers


class OrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Product not available")
        return value


class PlaceOrderSerializer(serializers.Serializer):
    items = OrderItemSerializer(many=True, min_length=1)

    def create(self, validated_data):
        return OrderService.place_order(
            user=self.context['request'].user,
            items_data=validated_data['items'],
        )
```

### ViewSet with Service Layer

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response


class OrderViewSet(viewsets.GenericViewSet):
    # Use GenericViewSet (not ModelViewSet) to avoid exposing CRUD directly

    def get_queryset(self):
        return OrderSelector.get_user_orders(self.request.user)

    @action(detail=False, methods=['post'])
    def place(self, request):
        serializer = PlaceOrderSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        OrderService.cancel_order(order, cancelled_by=request.user)
        return Response(status=status.HTTP_200_OK)
```

## Caching Patterns

```python
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete


def get_product_list():
    cache_key = 'products:active_list'
    products = cache.get(cache_key)
    if products is None:
        products = list(Product.objects.filter(is_active=True))
        cache.set(cache_key, products, timeout=300)  # 5 min
    return products


def invalidate_product_cache(sender, instance, **kwargs):
    cache.delete('products:active_list')
    cache.delete(f'products:detail:{instance.id}')


post_save.connect(invalidate_product_cache, sender=Product)
post_delete.connect(invalidate_product_cache, sender=Product)
```

## Signal Patterns

```python
# Use signals for cross-app communication, NOT for in-app logic
from django.dispatch import Signal

# Define custom signals
order_placed = Signal()
order_cancelled = Signal()

# Connect in apps/orders/apps.py
class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.orders'

    def ready(self):
        from . import signals  # noqa — register signal handlers


# apps/notifications/signals.py
@receiver(order_placed)
def send_order_confirmation(sender, order, **kwargs):
    send_mail(
        subject=f'Order #{order.id} confirmed',
        message=f'Your order has been placed.',
        recipient_list=[order.user.email],
    )
```

## Middleware Patterns

```python
# Custom middleware for request timing
import time
import logging

logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration = time.monotonic() - start
        response['X-Request-Duration-ms'] = str(int(duration * 1000))
        if duration > 1.0:
            logger.warning(
                "Slow request", extra={
                    'path': request.path,
                    'duration': duration,
                }
            )
        return response
```

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Fat views (500+ lines) | Untestable, duplicates logic | Service layer + selectors |
| N+1 queries | DB hammered with redundant queries | `select_related` / `prefetch_related` |
| Single settings file | Secrets in VCS, no env separation | Split settings (base/dev/prod) |
| Business logic in serializers | Tied to HTTP layer, can't reuse | Service layer, call from serializer |
| `.save()` in a loop | Hundreds of individual INSERTs | `bulk_create` |
| Exceptions for control flow | Non-obvious code paths, slow | Return values, status enums |
| Ignoring indexes | Full table scans on large tables | `db_index=True`, `Meta.indexes` |
| Signals for in-app logic | Implicit, hard to trace | Call service methods directly |
| Caching without invalidation | Stale data shown to users | Signal-based cache invalidation |

## Verification Checklist

- [ ] Settings split into base / dev / prod
- [ ] Custom QuerySet for reusable query patterns
- [ ] Service layer separates business logic from views
- [ ] `select_related` / `prefetch_related` used on all list/detail queries
- [ ] Bulk operations used for multi-row inserts/updates
- [ ] Cache with TTL and signal-based invalidation
- [ ] Signals only for cross-app communication
- [ ] Custom middleware is minimal and focused
- [ ] `transaction.atomic` on all multi-step mutations
- [ ] No N+1 queries in any view or serializer

## Reference Files

- [references/models-patterns.md](references/models-patterns.md) — Model design, QuerySet best practices, manager methods, signals, caching, and bulk operations
- [references/views-patterns.md](references/views-patterns.md) — DRF serializer patterns, ViewSet patterns, custom actions, and service layer
- [references/middleware-patterns.md](references/middleware-patterns.md) — Project layout, split settings, and custom middleware