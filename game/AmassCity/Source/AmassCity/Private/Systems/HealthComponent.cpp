#include "Systems/HealthComponent.h"

UHealthComponent::UHealthComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UHealthComponent::BeginPlay()
{
	Super::BeginPlay();
	Health = MaxHealth;
	OnHealthChanged.Broadcast(Health, MaxHealth);
}

void UHealthComponent::ApplyDamage(float Amount, AActor* /*Instigator*/)
{
	if (IsDead() || Amount <= 0.f)
	{
		return;
	}

	Health = FMath::Max(0.f, Health - Amount);
	OnHealthChanged.Broadcast(Health, MaxHealth);

	if (IsDead())
	{
		OnDeath.Broadcast();
	}
}

void UHealthComponent::Heal(float Amount)
{
	if (IsDead() || Amount <= 0.f)
	{
		return;
	}

	Health = FMath::Min(MaxHealth, Health + Amount);
	OnHealthChanged.Broadcast(Health, MaxHealth);
}
