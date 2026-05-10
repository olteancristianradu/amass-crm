#include "Vehicles/AmassVehicleBase.h"

#include "Camera/CameraComponent.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"

#include "Player/AmassCharacter.h"

AAmassVehicleBase::AAmassVehicleBase()
{
	PrimaryActorTick.bCanEverTick = true;

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(GetMesh());
	CameraBoom->TargetArmLength = 600.f;
	CameraBoom->bUsePawnControlRotation = true;
	CameraBoom->bEnableCameraLag = true;
	CameraBoom->CameraLagSpeed = 8.f;
	CameraBoom->SocketOffset = FVector(0.f, 0.f, 150.f);

	ChaseCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
	ChaseCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);

	if (UChaosWheeledVehicleMovementComponent* MoveComp =
		Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovement()))
	{
		MoveComp->EngineSetup.MaxRPM = 6500.f;
		MoveComp->EngineSetup.MaxTorque = 750.f;
		MoveComp->TransmissionSetup.bUseAutomaticGears = true;
		MoveComp->DifferentialSetup.DifferentialType = EVehicleDifferential::AllWheelDrive;
	}
}

void AAmassVehicleBase::BeginPlay()
{
	Super::BeginPlay();
}

void AAmassVehicleBase::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
}

void AAmassVehicleBase::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (APlayerController* PC = Cast<APlayerController>(GetController()))
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
			ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			Subsystem->ClearAllMappings();
			if (VehicleMappingContext)
			{
				Subsystem->AddMappingContext(VehicleMappingContext, 0);
			}
		}
	}

	if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		if (ThrottleAction)  EIC->BindAction(ThrottleAction,  ETriggerEvent::Triggered, this, &AAmassVehicleBase::Throttle);
		if (ThrottleAction)  EIC->BindAction(ThrottleAction,  ETriggerEvent::Completed, this, &AAmassVehicleBase::Throttle);
		if (BrakeAction)     EIC->BindAction(BrakeAction,     ETriggerEvent::Triggered, this, &AAmassVehicleBase::Brake);
		if (BrakeAction)     EIC->BindAction(BrakeAction,     ETriggerEvent::Completed, this, &AAmassVehicleBase::Brake);
		if (SteerAction)     EIC->BindAction(SteerAction,     ETriggerEvent::Triggered, this, &AAmassVehicleBase::Steer);
		if (SteerAction)     EIC->BindAction(SteerAction,     ETriggerEvent::Completed, this, &AAmassVehicleBase::Steer);
		if (HandbrakeAction)
		{
			EIC->BindAction(HandbrakeAction, ETriggerEvent::Started,   this, &AAmassVehicleBase::HandbrakePressed);
			EIC->BindAction(HandbrakeAction, ETriggerEvent::Completed, this, &AAmassVehicleBase::HandbrakeReleased);
		}
		if (LookAction)      EIC->BindAction(LookAction,      ETriggerEvent::Triggered, this, &AAmassVehicleBase::Look);
		if (ExitAction)      EIC->BindAction(ExitAction,      ETriggerEvent::Started,   this, &AAmassVehicleBase::ExitVehicle);
	}
}

float AAmassVehicleBase::GetSpeedKmh() const
{
	return GetVelocity().Size() * 0.036f;
}

void AAmassVehicleBase::Throttle(const FInputActionValue& Value)
{
	if (UChaosWheeledVehicleMovementComponent* M =
		Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovement()))
	{
		M->SetThrottleInput(Value.Get<float>());
	}
}

void AAmassVehicleBase::Brake(const FInputActionValue& Value)
{
	if (UChaosWheeledVehicleMovementComponent* M =
		Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovement()))
	{
		M->SetBrakeInput(Value.Get<float>());
	}
}

void AAmassVehicleBase::Steer(const FInputActionValue& Value)
{
	if (UChaosWheeledVehicleMovementComponent* M =
		Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovement()))
	{
		M->SetSteeringInput(Value.Get<float>());
	}
}

void AAmassVehicleBase::HandbrakePressed()
{
	if (UChaosWheeledVehicleMovementComponent* M =
		Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovement()))
	{
		M->SetHandbrakeInput(true);
	}
}

void AAmassVehicleBase::HandbrakeReleased()
{
	if (UChaosWheeledVehicleMovementComponent* M =
		Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovement()))
	{
		M->SetHandbrakeInput(false);
	}
}

void AAmassVehicleBase::Look(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(Axis.Y);
}

void AAmassVehicleBase::ExitVehicle()
{
	if (AAmassCharacter* DriverPtr = Driver.Get())
	{
		DriverPtr->ExitVehicle();
	}
}
