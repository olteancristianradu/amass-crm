#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHealthChanged, float, NewHealth, float, MaxHealth);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnDeath);

UCLASS(ClassGroup = (Amass), meta = (BlueprintSpawnableComponent))
class AMASSCITY_API UHealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UHealthComponent();

	UFUNCTION(BlueprintCallable, Category = "Amass|Health")
	void ApplyDamage(float Amount, AActor* Instigator = nullptr);

	UFUNCTION(BlueprintCallable, Category = "Amass|Health")
	void Heal(float Amount);

	UFUNCTION(BlueprintPure, Category = "Amass|Health")
	float GetHealth() const { return Health; }

	UFUNCTION(BlueprintPure, Category = "Amass|Health")
	float GetMaxHealth() const { return MaxHealth; }

	UFUNCTION(BlueprintPure, Category = "Amass|Health")
	bool IsDead() const { return Health <= 0.f; }

	UPROPERTY(BlueprintAssignable, Category = "Amass|Health")
	FOnHealthChanged OnHealthChanged;

	UPROPERTY(BlueprintAssignable, Category = "Amass|Health")
	FOnDeath OnDeath;

protected:
	virtual void BeginPlay() override;

	UPROPERTY(EditDefaultsOnly, Category = "Amass|Health", meta = (ClampMin = "1.0"))
	float MaxHealth = 100.f;

private:
	float Health = 100.f;
};
